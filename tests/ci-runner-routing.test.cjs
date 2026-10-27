const assert = require('node:assert/strict');
const {readFileSync}=require('node:fs');
const test=require('node:test');

test('repository branch validation uses hosted isolation while main retains the quarantined group',()=>{
 const workflow=readFileSync('.github/workflows/ci.yml','utf8');
 const routes=[...workflow.matchAll(/^ {4}runs-on: (.+)$/gm)].map(match=>match[1]);
 assert.equal(routes.length,3);
 for(const route of routes){
  assert.equal(route, '${{ github.ref == \'refs/heads/main\' && fromJSON(\'{"group":"Public CI - Quarantined","labels":["self-hosted","Linux","X64"]}\') || \'ubuntu-latest\' }}');
 }
 assert.match(workflow,/push:\n {4}branches: \["\*\*"\]/u);
 assert.doesNotMatch(workflow,/pull_request_target|id-token: write|contents: write/u);
 for(const gate of ['npm run audit:npm','npm run typecheck','npm run pack:check','npm run test:coverage','pct >= 80'])assert.ok(workflow.includes(gate));
});
