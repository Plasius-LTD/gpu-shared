const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

const REPOSITORY = 'Plasius-LTD/gpu-shared';
const PACKAGE = '@plasius/gpu-shared';
const WORKFLOW = '.github/workflows/cd.yml';
const fail = message => { throw new Error(message); };
const sha256 = data => crypto.createHash('sha256').update(data).digest('hex');

function identity(env) {
  if (env.GITHUB_REPOSITORY !== REPOSITORY || env.GITHUB_REF !== 'refs/heads/main') fail('Finalisation requires this repository main.');
  if (!/^[a-f0-9]{40}$/.test(env.EXPECTED_SHA ?? '') || !/^[a-f0-9]{40}$/.test(env.GITHUB_SHA ?? '')) fail('Expected full source and workflow SHAs.');
  if (!/^[1-9][0-9]{0,14}$/.test(env.PUBLISHED_RUN_ID ?? '')) fail('Invalid publication run.');
  if (!/^v\d+\.\d+\.\d+(?:-[0-9A-Za-z]+(?:[.-][0-9A-Za-z]+)*)?$/.test(env.RELEASE_TAG ?? '')) fail('Invalid release tag.');
  return { sha: env.EXPECTED_SHA, runId: Number(env.PUBLISHED_RUN_ID), tag: env.RELEASE_TAG, version: env.RELEASE_TAG.slice(1), workflowSha: env.GITHUB_SHA };
}
function verifyRun(run, wanted) {
  if (run.id !== wanted.runId || run.repository?.full_name !== REPOSITORY || run.path !== WORKFLOW
    || run.event !== 'workflow_dispatch' || run.head_branch !== 'main' || run.head_sha !== wanted.sha || run.status !== 'completed') fail('Publication run identity mismatch.');
}
function verifyJobs(jobs) {
  const build = jobs.find(job => job.name === 'validate_and_pack');
  const publish = jobs.find(job => job.name === 'publish');
  if (build?.conclusion !== 'success' || !publish) fail('Missing successful immutable build.');
  for (const name of ['Enforce exact-main release identity', 'Verify immutable publication bundle',
    'Revalidate exact main immediately before release mutation', 'Attest immutable package tarball',
    'Attest immutable SBOM', 'Attest immutable Zero-Three evidence']) {
    if (!publish.steps?.some(step => step.name === name && step.conclusion === 'success')) fail(`Missing publication evidence: ${name}`);
  }
  if (!publish.steps.some(step => ['Publish package through npm OIDC', 'Skip duplicate npm publication'].includes(step.name) && step.conclusion === 'success')) fail('npm publication did not complete.');
  if (!['success','failure'].includes(publish.conclusion) || publish.steps.some(step => step.conclusion === 'failure' && !['Verify exact npm registry publication','Publish GitHub Release'].includes(step.name))) fail('Publication failed outside finalisation.');
}
function verifyCi(runs, wanted) {
  if (!runs.some(run => run.head_sha === wanted.sha && run.head_branch === 'main' && run.event === 'push' && run.path === '.github/workflows/ci.yml' && run.status === 'completed' && run.conclusion === 'success')) fail('Successful exact-source main CI is required.');
}
function releaseFingerprint(release) {
  return sha256(JSON.stringify([release.id, release.tag_name, release.target_commitish, release.draft,
    release.prerelease, release.name ?? null, release.body ?? null,
    [...release.assets].sort((a,b)=>a.id-b.id).map(a=>[a.id,a.name,a.size,a.digest??null,a.updated_at])]));
}
function verifyRelease(release, tag, wanted) {
  if (release.tag_name !== wanted.tag || tag.object?.type !== 'commit' || tag.object.sha !== wanted.sha
    || release.prerelease !== wanted.version.includes('-') || typeof release.draft !== 'boolean' || !Number.isSafeInteger(release.id)) fail('Release or source tag mismatch.');
  const names = release.assets.map(a=>a.name).sort();
  if (JSON.stringify(names) !== JSON.stringify(['sbom.cdx.json','zero-three-evidence.json'])) fail('Release attachments differ from sealed publication.');
}
function verifyRegistry(metadata, keys, tarball, wanted) {
  if (metadata.name !== PACKAGE || metadata.version !== wanted.version) fail('npm identity mismatch.');
  const integrity = `sha512-${crypto.createHash('sha512').update(tarball).digest('base64')}`;
  if (metadata.dist?.integrity !== integrity) fail('npm integrity mismatch.');
  const message = Buffer.from(`${PACKAGE}@${wanted.version}:${integrity}`);
  const signed = (metadata.dist.signatures ?? []).some(signature => {
    const key = keys.keys?.find(item => item.keyid === signature.keyid);
    if (!key) return false;
    try { return crypto.verify('sha256', message, {key:Buffer.from(key.key,'base64'),format:'der',type:'spki'}, Buffer.from(signature.sig,'base64')); }
    catch { return false; }
  });
  if (!signed) fail('npm registry signature verification failed.');
  return integrity;
}
function verifyProvenance(attestations, tarball, wanted, maximumAttempt) {
  const entries = attestations.attestations.filter(item=>item.predicateType==='https://slsa.dev/provenance/v1');
  for (const entry of entries) {
    const statement = JSON.parse(Buffer.from(entry.bundle.dsseEnvelope.payload,'base64').toString('utf8'));
    const predicate=statement.predicate, definition=predicate?.buildDefinition;
    const workflow=definition?.externalParameters?.workflow;
    const invocation=predicate?.runDetails?.metadata?.invocationId ?? '';
    const match=invocation.match(new RegExp(`^https://github\\.com/${REPOSITORY}/actions/runs/${wanted.runId}/attempts/([1-9][0-9]*)$`));
    const subject=statement.subject?.find(item=>item.name===`pkg:npm/%40plasius/gpu-shared@${wanted.version}`);
    const digest=subject?.digest;
    const matchesDigest=digest?.sha512===crypto.createHash('sha512').update(tarball).digest('hex') || digest?.sha256===sha256(tarball);
    if (statement.predicateType==='https://slsa.dev/provenance/v1' && matchesDigest
      && workflow?.repository===`https://github.com/${REPOSITORY}` && workflow.ref==='refs/heads/main' && workflow.path===WORKFLOW
      && definition.resolvedDependencies?.some(item=>item.uri===`git+https://github.com/${REPOSITORY}@refs/heads/main` && item.digest?.gitCommit===wanted.sha)
      && match && Number(match[1])<=maximumAttempt) return Number(match[1]);
  }
  fail('npm provenance does not identify the approved source publication.');
}

/** This orchestrator runs only in the read-only verification job. */
async function verifyFinalization(env, io) {
  const wanted=identity(env);
  const run=await io.github(`actions/runs/${wanted.runId}`); verifyRun(run,wanted);
  const main=await io.github('git/ref/heads/main');
  if (main.object?.sha!==wanted.workflowSha) fail('Workflow main has advanced.');
  io.ancestor(wanted.sha,wanted.workflowSha);
  const ci=await io.github(`actions/workflows/ci.yml/runs?branch=main&event=push&head_sha=${wanted.sha}&status=success&per_page=100`);verifyCi(ci.workflow_runs,wanted);
  const tag=await io.github(`git/ref/tags/${wanted.tag}`);
  const release=await io.release();verifyRelease(release,tag,wanted);
  const fingerprint=releaseFingerprint(release);
  const metadata=await io.registry(`/${encodeURIComponent(PACKAGE)}/${wanted.version}`);
  const tarball=await io.bytes(`https://registry.npmjs.org/@plasius/gpu-shared/-/gpu-shared-${wanted.version}.tgz`);
  const keys=await io.registry('/-/npm/v1/keys');
  const integrity=verifyRegistry(metadata,keys,tarball,wanted);
  const attestations=await io.registry(`/-/npm/v1/attestations/${encodeURIComponent(PACKAGE)}@${wanted.version}`);
  const attempt=verifyProvenance(attestations,tarball,wanted,run.run_attempt);
  const jobs=await io.github(`actions/runs/${wanted.runId}/attempts/${attempt}/jobs?per_page=100`);verifyJobs(jobs.jobs);
  // GitHub's signed artifact provenance independently binds registry bytes and
  // release attachments to the original workflow/source, even after artifact expiry.
  await io.attest(`gpu-shared-${wanted.version}.tgz`,tarball,wanted.sha);
  for (const asset of release.assets) {
    if (!Number.isSafeInteger(asset.id) || !Number.isSafeInteger(asset.size) || asset.size<=0 || asset.size>10*1024*1024) fail('Invalid release attachment.');
    const bytes=await io.asset(asset.id);
    if (bytes.length!==asset.size || (asset.digest && asset.digest!==`sha256:${sha256(bytes)}`)) fail('Attachment digest/size mismatch.');
    await io.attest(asset.name,bytes,wanted.sha);
  }
  // The dependency-free mutation job rechecks this complete fingerprint using
  // draft visibility; this verifier never receives contents-write authority.
  return { release_id:release.id, release_fingerprint:fingerprint, source_sha:wanted.sha,
    release_tag:wanted.tag, tarball_integrity:integrity, already_complete:!release.draft };
}

async function main() {
  const temporary=path.resolve(process.env.RUNNER_TEMP ?? '.');fs.mkdirSync(temporary,{recursive:true});
  const directory=fs.mkdtempSync(path.join(temporary,'verified-finalization-'));
  const snapshot=path.resolve(process.env.FINALIZATION_SNAPSHOT ?? 'finalization-input');
  const release=JSON.parse(fs.readFileSync(path.join(snapshot,'release.json'),'utf8'));
  const command=(args,options={})=>execFileSync('gh',args,{maxBuffer:16*1024*1024,...options});
  const bytes=async url=>{
    const response=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(30000)});
    if(!response.ok)fail(`Registry request failed: ${response.status}`);
    const buffer=Buffer.from(await response.arrayBuffer());if(buffer.length>40*1024*1024)fail('Registry response exceeded budget.');return buffer;
  };
  const result=await verifyFinalization(process.env,{
    github:async endpoint=>JSON.parse(command(['api',`repos/${REPOSITORY}/${endpoint}`],{encoding:'utf8'})),
    registry:async endpoint=>JSON.parse((await bytes(`https://registry.npmjs.org${endpoint}`)).toString('utf8')),
    bytes,
    ancestor:(source,head)=>execFileSync('git',['merge-base','--is-ancestor',source,head]),
    release:async()=>release,
    asset:async id=>{const asset=release.assets.find(item=>item.id===id);return fs.readFileSync(path.join(snapshot,asset.name));},
    attest:async(name,data,sha)=>{
      const file=path.join(directory,name);fs.writeFileSync(file,data,{flag:'wx'});
      command(['attestation','verify',file,'--repo',REPOSITORY,'--signer-workflow',`${REPOSITORY}/${WORKFLOW}`,
        '--source-ref','refs/heads/main','--source-digest',sha,'--signer-digest',sha,'--deny-self-hosted-runners'],{stdio:['ignore','pipe','pipe']});
    },
  });
  if(!process.env.GITHUB_OUTPUT)fail('GITHUB_OUTPUT is required.');
  fs.appendFileSync(process.env.GITHUB_OUTPUT,Object.entries(result).map(([key,value])=>`${key}=${value}\n`).join(''));
  console.log(`Verified ${PACKAGE} ${result.release_tag}; no publication or tag mutation performed.`);
}
module.exports={identity,verifyRun,verifyJobs,verifyCi,verifyRelease,releaseFingerprint,verifyRegistry,verifyProvenance,verifyFinalization};
if(require.main===module)main().catch(error=>{console.error(error.message);process.exitCode=1;});
