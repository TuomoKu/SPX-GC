const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const {fixture}=require('./playback.test.cjs');
const {DataSources}=require('../data.cjs');
test('reconciliation removes orphan items/fields, retains defaults and live references, and is idempotent',async t=>{
 const f=await fixture(t),sources=new DataSources(path.join(f.root,'sources.json'),f.stages);t.after(()=>sources.close());await sources.ready;
 await sources.edit(sources.snapshot().revision,next=>{
  next.mappings.push({stage:'stage-1',graphic:'deleted',field:'f5',source:'test.stage-1.currentRound'});
  next.mappings.push({stage:'stage-1',graphic:'live-deleted',field:'f5',source:'test.stage-1.currentRound'});
  next.mappings.push({stage:'stage-1',graphic:'ticker',field:'f99',source:'test.stage-1.currentRound'});
  next.defaults.push({stage:'stage-1',template:'/test/graphic.html',field:'f5',binding:{source:'test.stage-1.currentRound'}});
 });
 const defaults=structuredClone(sources.document.defaults);
 assert.equal((await sources.reconcileMappings(f.repository,()=>[{stage:'stage-1',graphic:'live-deleted'}])).removed,2);
 assert.deepEqual(sources.document.defaults,defaults);
 assert.ok(sources.document.mappings.some(m=>m.graphic==='live-deleted'));
 assert.ok(sources.document.mappings.some(m=>m.graphic==='ticker'&&m.field==='f5'));
 const revision=sources.document.revision;
 assert.equal((await sources.reconcileMappings(f.repository,()=>[{stage:'stage-1',graphic:'live-deleted'}])).removed,0);
 assert.equal(sources.document.revision,revision);
 assert.equal((await sources.reconcileMappings(f.repository)).removed,1);
 const persisted=JSON.parse(await fs.readFile(sources.file,'utf8'));assert.deepEqual(persisted.mappings,sources.document.mappings);
});
test('missing, malformed and incomplete rundowns never erase mappings',async t=>{
 const f=await fixture(t),sources=new DataSources(path.join(f.root,'sources.json'),f.stages);t.after(()=>sources.close());await sources.ready;
 const before=structuredClone(sources.document.mappings),file=f.repository.stage('stage-1').file;
 await fs.unlink(file);await sources.reconcileMappings(f.repository);assert.deepEqual(sources.document.mappings,before);
 for(const text of ['{',JSON.stringify({templates:[{itemID:'ticker'}]})]){await fs.writeFile(file,text);await sources.reconcileMappings(f.repository);assert.deepEqual(sources.document.mappings,before);}
});
