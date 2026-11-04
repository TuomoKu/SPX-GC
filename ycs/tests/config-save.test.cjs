const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const os=require('node:os');
const vm=require('node:vm');
const configStore=require('../../utils/config-store.cjs');

async function harness(t, existing, failure=false) {
  const directory=await fs.mkdtemp(path.join(os.tmpdir(),'ycs-config-save-'));
  t.after(()=>fs.rm(directory,{recursive:true,force:true}));
  const file=path.join(directory,'config.json');
  await fs.writeFile(file,JSON.stringify(existing));
  const source=await fs.readFile(path.resolve(__dirname,'../../routes/routes-application.js'),'utf8');
  const start=source.indexOf("router.post('/config',");
  const end=source.indexOf('}); // post /config end',start);
  assert.ok(start>=0&&end>start);
  let handler;
  const context={
    config:structuredClone(existing),configfileref:file,structuredClone,
    configStore: { update: failure ? async()=>{throw Error('Disk unavailable');} : configStore.update },
    router:{post(url,auth,callback){handler=callback;}},
    spxAuth:{CheckLogin(){}},logger:{debug(){},error(){}},
    spx:{async writeFile(target,data){if(failure)throw Error('Disk unavailable');await fs.writeFile(target,JSON.stringify(data));}},
    cfg:{async readConfig(){context.config=JSON.parse(await fs.readFile(file,'utf8'));}}
  };
  context.global=context;
  vm.runInNewContext(source.slice(start,end+'}); // post /config end'.length),context);
  return {
    file,
    async save(body){
      let rendered;
      await handler({body,session:{user:'operator'}},{render(view,data){rendered=JSON.parse(JSON.stringify(data));}});
      assert.ok(rendered,'handler waits for persistence and rendering');
      return {rendered,saved:JSON.parse(await fs.readFile(file,'utf8')),loaded:context.config};
    }
  };
}

const ycs={enabled:true,listenHost:'127.0.0.1',graphicsRoot:'C:/Graphics',dataFile:'C:/Show/sources.json',apiKey:'test-only-token',stages:[{id:'stage-1',project:'YCS-Stage-1',rundown:'Show'}],slots:{ticker:{order:10,exitMs:250}}};

test('stock settings save and reload retain the complete server-owned YCS configuration',async t=>{
  const r=await harness(t,{general:{recents:['YCS-Stage-1/Show'],launchBrowser:true},ycs});
  const result=await r.save({general:{port:'5660',greeting:'Updated'},globalExtras:{customscript:''}});
  assert.deepEqual(result.saved.ycs,ycs);
  assert.deepEqual(JSON.parse(JSON.stringify(result.loaded.ycs)),ycs);
  assert.equal(result.saved.general.greeting,'Updated');
  assert.equal(Object.hasOwn(result.saved.general,'launchBrowser'),false,'unchecked stock checkboxes still clear');
  assert.deepEqual(result.saved.general.recents,['YCS-Stage-1/Show']);
  assert.equal(result.rendered.message,'Changes saved');
});

test('posted YCS values cannot overwrite protected routing, paths or API credentials',async t=>{
  const r=await harness(t,{general:{},ycs});
  const result=await r.save({general:{port:'5660'},ycs:{enabled:false,apiKey:'replacement',graphicsRoot:'C:/Other'}});
  assert.deepEqual(result.saved.ycs,ycs);
});

test('a stock installation remains stock even if a client submits a YCS section',async t=>{
  const r=await harness(t,{general:{}});
  const result=await r.save({general:{port:'5660'},ycs});
  assert.equal(Object.hasOwn(result.saved,'ycs'),false);
});

test('rejected persistence renders an error without claiming a successful save',async t=>{
  const original={general:{port:5660},ycs};
  const r=await harness(t,original,true);
  const result=await r.save({general:{port:'9999'}});
  assert.equal(result.rendered.error,'Error saving config');
  assert.equal(result.rendered.message,undefined);
  assert.deepEqual(result.saved,original);
});

test('stock form preserves YCS settings saved after its in-memory configuration was loaded',async t=>{
  const r=await harness(t,{general:{recents:['old']},ycs});
  await configStore.update(r.file,current=>{current.ycs.graphicsRoot='C:/New graphics';current.general.recents=['Latest/Show'];});
  const result=await r.save({general:{port:'5660'}});
  assert.equal(result.saved.ycs.graphicsRoot,'C:/New graphics');
  assert.deepEqual(result.saved.general.recents,['Latest/Show']);
});
