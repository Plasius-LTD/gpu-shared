const {test}=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const policy=require('../scripts/release/verify-finalization.cjs');
const sha='a'.repeat(40),head='b'.repeat(40),runId=123;
// Check workflow identity against the package's declared public repository.
const repositoryUrl = new URL(require('../package.json').repository.url.replace(/^git\+/, ''));
const repo = repositoryUrl.pathname.slice(1).replace(/\.git$/, '');
const env={GITHUB_REPOSITORY:repo,GITHUB_REF:'refs/heads/main',GITHUB_SHA:head,EXPECTED_SHA:sha,PUBLISHED_RUN_ID:String(runId),RELEASE_TAG:'v1.6.0'};
function fixture(){
 const data=Buffer.from('immutable publication'),integrity='sha512-'+crypto.createHash('sha512').update(data).digest('base64');
 const {publicKey,privateKey}=crypto.generateKeyPairSync('ec',{namedCurve:'prime256v1'});
 const keys={keys:[{keyid:'test-key',key:publicKey.export({type:'spki',format:'der'}).toString('base64')}]};
 const metadata={name:'@plasius/gpu-shared',version:'1.6.0',dist:{integrity,signatures:[{keyid:'test-key',sig:crypto.sign('sha256',Buffer.from(`@plasius/gpu-shared@1.6.0:${integrity}`),privateKey).toString('base64')}]}};
 const run={id:runId,repository:{full_name:repo},path:'.github/workflows/cd.yml',event:'workflow_dispatch',head_branch:'main',head_sha:sha,status:'completed',run_attempt:1};
 const steps=['Enforce exact-main release identity','Verify immutable publication bundle','Revalidate exact main immediately before release mutation','Attest immutable package tarball','Attest immutable SBOM','Attest immutable Zero-Three evidence','Publish package through npm OIDC'].map(name=>({name,conclusion:'success'}));steps.push({name:'Verify exact npm registry publication',conclusion:'failure'});
 const jobs=[{name:'validate_and_pack',conclusion:'success'},{name:'publish',conclusion:'failure',steps}];
 const ci=[{head_sha:sha,head_branch:'main',event:'push',path:'.github/workflows/ci.yml',status:'completed',conclusion:'success'}];
 const tag={object:{type:'commit',sha}};
 const release={id:45,tag_name:'v1.6.0',target_commitish:'main',draft:true,prerelease:false,name:'Release',body:'Reviewed notes',assets:['sbom.cdx.json','zero-three-evidence.json'].map((name,index)=>({id:index+1,name,size:4,digest:'sha256:'+crypto.createHash('sha256').update('test').digest('hex'),updated_at:'2026-01-01'}))};
 const statement={predicateType:'https://slsa.dev/provenance/v1',subject:[{name:'pkg:npm/%40plasius/gpu-shared@1.6.0',digest:{sha512:crypto.createHash('sha512').update(data).digest('hex')}}],predicate:{buildDefinition:{externalParameters:{workflow:{repository:`https://github.com/${repo}`,ref:'refs/heads/main',path:'.github/workflows/cd.yml'}},resolvedDependencies:[{uri:`git+https://github.com/${repo}@refs/heads/main`,digest:{gitCommit:sha}}]},runDetails:{metadata:{invocationId:`https://github.com/${repo}/actions/runs/${runId}/attempts/1`}}}};
 const attestations=()=>({attestations:[{predicateType:statement.predicateType,bundle:{dsseEnvelope:{payload:Buffer.from(JSON.stringify(statement)).toString('base64')}}}]});
 const evidence=[];
 const io={github:async endpoint=>{
  if(endpoint===`actions/runs/${runId}`)return run;
  if(endpoint==='git/ref/heads/main')return {object:{sha:head}};
  if(endpoint.startsWith('actions/workflows/ci.yml/runs?'))return {workflow_runs:ci};
  if(endpoint==='git/ref/tags/v1.6.0')return tag;
  if(endpoint===`actions/runs/${runId}/attempts/1/jobs?per_page=100`)return {jobs};

  throw new Error(`Unexpected endpoint ${endpoint}`);
 },registry:async endpoint=>endpoint.includes('attestations')?attestations():endpoint.endsWith('keys')?keys:metadata,
 release:async()=>release,bytes:async()=>data,asset:async()=>Buffer.from('test'),ancestor:(source,tip)=>assert.deepEqual([source,tip],[sha,head]),attest:async(...args)=>evidence.push(args)};
 return {data,metadata,keys,run,jobs,ci,tag,release,statement,attestations,io,evidence};
}
test('verifies the original immutable publication and both attested release attachments without writes',async()=>{
 const f=fixture(),result=await policy.verifyFinalization(env,f.io);
 assert.equal(result.release_id,45);assert.equal(result.already_complete,false);assert.equal(result.source_sha,sha);
 assert.deepEqual(f.evidence.map(x=>x[0]),['gpu-shared-1.6.0.tgz','sbom.cdx.json','zero-three-evidence.json']);
 assert.ok(f.evidence.every(x=>x[2]===sha));
 f.release.draft=false;assert.equal((await policy.verifyFinalization(env,f.io)).already_complete,true);
});
for(const [key,value] of [['GITHUB_REPOSITORY','other/repo'],['GITHUB_REF','refs/heads/feature'],['EXPECTED_SHA','short'],['GITHUB_SHA','short'],['PUBLISHED_RUN_ID','1;echo'],['RELEASE_TAG','v1.6.0/../../x']])test(`rejects invalid ${key}`,()=>assert.throws(()=>policy.identity({...env,[key]:value})));
for(const [label,change] of [
 ['other workflow',f=>f.run.path='.github/workflows/alternate.yml'],['wrong source',f=>f.run.head_sha=head],['incomplete run',f=>f.run.status='in_progress'],
 ['failed build',f=>f.jobs[0].conclusion='failure'],['missing publication',f=>f.jobs[1].steps.find(x=>x.name==='Publish package through npm OIDC').conclusion='skipped'],
 ['missing attestation',f=>f.jobs[1].steps.find(x=>x.name==='Attest immutable package tarball').conclusion='failure'],
 ['unrelated failure',f=>f.jobs[1].steps.push({name:'Install dependencies',conclusion:'failure'})],
 ['cancelled publication',f=>f.jobs[1].conclusion='cancelled'],['unqualified CI',f=>f.ci[0].event='pull_request'],
 ['wrong tag',f=>f.tag.object.sha=head],['changed release version',f=>f.release.tag_name='v2.0.0'],['wrong prerelease state',f=>f.release.prerelease=true],
 ['unexpected attachment',f=>f.release.assets.push({id:3,name:'unknown'})],['bad attachment id',f=>f.release.assets[0].id='1'],['bad attachment size',f=>f.release.assets[0].size=2],['bad attachment digest',f=>f.release.assets[0].digest='sha256:wrong'],
 ['wrong package',f=>f.metadata.name='different'],['different bytes',f=>f.metadata.dist.integrity='sha512:wrong'],['no registry signature',f=>f.metadata.dist.signatures=[]],
 ['wrong registry key',f=>f.keys.keys=[]],['corrupt public key',f=>f.keys.keys[0].key='invalid'],['bad signature',f=>f.metadata.dist.signatures[0].sig='invalid'],
 ['wrong provenance source',f=>f.statement.predicate.buildDefinition.resolvedDependencies[0].digest.gitCommit=head],
 ['wrong provenance workflow',f=>f.statement.predicate.buildDefinition.externalParameters.workflow.ref='refs/heads/feature'],
 ['wrong provenance digest',f=>f.statement.subject[0].digest.sha512='bad'],['unbound invocation',f=>f.statement.predicate.runDetails.metadata.invocationId=`https://github.com/${repo}/actions/runs/999/attempts/1`],
 ['future attempt',f=>f.statement.predicate.runDetails.metadata.invocationId=`https://github.com/${repo}/actions/runs/123/attempts/2`],
 ['GitHub attestation failure',f=>f.io.attest=async()=>{throw new Error('invalid attestation');}],
 ['source not on main',f=>f.io.ancestor=()=>{throw new Error('not an ancestor');}],
])test(`fails closed: ${label}`,async()=>{const f=fixture();change(f);await assert.rejects(policy.verifyFinalization(env,f.io));});
test('refuses main advancing during verification',async()=>{
 const f=fixture(),base=f.io.github;f.io.github=async endpoint=>endpoint==='git/ref/heads/main'?{object:{sha:'c'.repeat(40)}}:base(endpoint);
 await assert.rejects(policy.verifyFinalization(env,f.io));
});
test('supports a SHA-256 provenance subject and an already-verified duplicate publication',async()=>{
 const f=fixture();f.statement.subject[0].digest={sha256:crypto.createHash('sha256').update(f.data).digest('hex')};
 f.jobs[1].steps.find(x=>x.name==='Publish package through npm OIDC').name='Skip duplicate npm publication';
 assert.equal((await policy.verifyFinalization(env,f.io)).source_sha,sha);
});
test('fingerprint binds release body, attachment identity and metadata with deterministic ordering',()=>{
 const f=fixture(),original=policy.releaseFingerprint(f.release);f.release.assets.reverse();assert.equal(policy.releaseFingerprint(f.release),original);
 f.release.assets[0].id=99;assert.notEqual(policy.releaseFingerprint(f.release),original);
});
test('finalization workflow has no npm write/OIDC authority and preserves exact-main publication checks',()=>{
 const source=fs.readFileSync('.github/workflows/cd.yml','utf8');
 assert.match(source,/finalize_verify:/);assert.match(source,/finalize_release:/);
 const write=source.slice(source.indexOf('  finalize_release:'));
 assert.match(write,/contents: write/);assert.doesNotMatch(write,/id-token: write|npm publish|npm install|node scripts\//);
 assert.match(write,/release_fingerprint/);assert.match(write,/draft=false/);assert.match(write,/make_latest=false/);
 const old=source.slice(0,source.indexOf('  finalize_verify:'));
 assert.equal((old.match(/REMOTE_MAIN.*!=.*EXPECTED_SHA/g)||[]).length,4);
});

test('privileged finalizer only clears the verified draft and refuses stale release, tag or main',()=>{
 const os=require('node:os'),path=require('node:path'),{execFileSync}=require('node:child_process');
 const workflow=fs.readFileSync('.github/workflows/cd.yml','utf8');
 const job=workflow.slice(workflow.indexOf('  finalize_release:'));
 const shell=job.slice(job.indexOf('        run: |\n')+'        run: |\n'.length).split('\n').map(line=>line.replace(/^ {10}/,'')).join('\n');
 for(const scenario of ['valid','already-complete','changed-release','changed-tag','changed-main']){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'release-finalizer-test-'));
  try{
   const f=fixture();f.release.body='Reviewed notes — line one\nSecond line';
   if(scenario==='already-complete')f.release.draft=false;
   const fingerprint=policy.releaseFingerprint(f.release);
   if(scenario==='changed-release')f.release.body='Changed';
   const config={release:f.release,tag:f.tag,main:head};
   if(scenario==='changed-main')config.main=sha;
   if(scenario==='changed-tag')config.tag.object.sha=head;
   fs.writeFileSync(path.join(root,'input.json'),JSON.stringify(config));
   fs.writeFileSync(path.join(root,'gh'),`#!/usr/bin/env node
const fs=require('node:fs'),path=require('node:path'),root=__dirname;
const input=JSON.parse(fs.readFileSync(path.join(root,'input.json'),'utf8')),args=process.argv.slice(2),endpoint=args[1],marker=path.join(root,'mutation');
if(args.includes('PATCH')){if(!args.includes('draft=false')||!args.includes('make_latest=false'))process.exit(3);fs.writeFileSync(marker,'draft=false');console.log('{}');}
else if(endpoint.endsWith('/git/ref/heads/main'))console.log(input.main);
else if(endpoint.includes('/git/ref/tags/'))console.log(JSON.stringify(input.tag));
else if(endpoint.includes('/releases/'))console.log(args.includes('--jq')?'false':JSON.stringify(input.release));
else process.exit(4);
`,{mode:0o700});
   const execute=()=>execFileSync('bash',['-c',shell],{env:{...process.env,PATH:root+path.delimiter+process.env.PATH,GITHUB_REF:'refs/heads/main',GITHUB_REPOSITORY:repo,GITHUB_SHA:head,RELEASE_ID:'45',SOURCE_SHA:sha,RELEASE_TAG:'v1.6.0',RELEASE_FINGERPRINT:fingerprint},stdio:'pipe'});
   if(scenario.startsWith('changed'))assert.throws(execute);else execute();
   assert.equal(fs.existsSync(path.join(root,'mutation')),scenario==='valid');
  }finally{fs.rmSync(root,{recursive:true,force:true});}
 }
});
