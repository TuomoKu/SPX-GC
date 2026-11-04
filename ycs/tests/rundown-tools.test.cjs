'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),{JSDOM}=require('jsdom');
async function fixture(t,stored){
 const dom=new JSDOM('<html data-ycs-stage="stage-1"><body><div id="itemList"><div class="itemrow inFocus" id="ticker"><div id="Collapsed"><table><tr><td><span data-ycs-item-title>Ticker</span></td></tr></table><div class="truncate">ROUND 1</div></div><input name="RundownItem[relpath]" value="/ticker.html"></div><div class="itemrow" id="chip"><div id="Collapsed"><table><tr><td><span data-ycs-item-title>Blue · Player Chip</span></td></tr></table><div class="truncate">SAM A. · GENESYS</div></div><input name="RundownItem[relpath]" value="/player-chip/blue.html"><input data-update="f1" value="UNSAVED"></div></div><button id="MasterTOGGLE">Play</button><button id="MasterUPDATE">Update</button><button id="MasterCONTINUE">Continue</button></body></html>',{url:'http://localhost/gc/Stage1/Show',runScripts:'outside-only'});
 const w=dom.window,calls=[],options={disabled:false};if(stored)w.localStorage.setItem('ycs.rundownDensity',stored);
 w.APPSTATE='DEFAULT';w.Sortable={get:()=>({option:(key,value)=>{if(value===undefined)return options[key];options[key]=value;}})};
 w.getFocusedRow=()=>w.document.querySelector('.inFocus');w.setMasterButtonStates=row=>calls.push(['master',row.id]);w.focusRow=row=>{for(const r of w.document.querySelectorAll('.itemrow'))r.classList.toggle('inFocus',r===row);w.setMasterButtonStates(row);calls.push(['preview',row.id]);};w.moveFocus=()=>calls.push(['nativeMove']);w.SaveNewSortOrder=()=>calls.push(['sort']);w.AppState=state=>{w.APPSTATE=state;options.disabled=state==='EDITING';};
 w.eval(await fs.readFile(path.join(__dirname,'../public/rundown-tools.js'),'utf8'));const tools=new w.YCSRundownTools();t.after(()=>{tools.dispose();w.close();});
 const search=value=>{tools.input.value=value;tools.input.dispatchEvent(new w.Event('input',{bubbles:true}));};
 return {w,tools,calls,options,search,ticker:w.document.getElementById('ticker'),chip:w.document.getElementById('chip'),flush:()=>new Promise(resolve=>setImmediate(resolve))};
}
test('search matches text and template names, retains drafts, clears hidden selection and never previews by itself',async t=>{
 const r=await fixture(t);r.search('sam genesys');assert.equal(r.ticker.hidden,true);assert.equal(r.chip.hidden,false);assert.equal(r.w.getFocusedRow(),null);assert.equal(r.w.document.getElementById('MasterTOGGLE').disabled,true);assert.equal(r.chip.querySelector('[data-update]').value,'UNSAVED');assert.equal(r.calls.length,0);
 r.w.moveFocus(1);assert.equal(r.w.getFocusedRow(),r.chip);assert.equal(r.calls.filter(c=>c[0]==='preview').length,1);assert.equal(r.w.document.getElementById('MasterTOGGLE').disabled,false);
 r.search('no result');assert.equal(r.tools.empty.hidden,false);r.w.focusRow(0);assert.equal(r.w.getFocusedRow(),null);
 const calls=r.calls.length;r.tools.reset();assert.equal(r.ticker.hidden,false);assert.equal(r.chip.hidden,false);assert.equal(r.calls.length,calls);assert.equal(r.w.getFocusedRow(),null);
 r.search('player-chip');assert.equal(r.chip.hidden,false);r.search('round');assert.equal(r.ticker.hidden,false);assert.equal(r.chip.hidden,true);
});
test('filtered sorting stays disabled through AppState changes and keyboard actions do not escape the toolbar',async t=>{
 const r=await fixture(t);r.search('sam');assert.equal(r.options.disabled,true);r.w.AppState('DEFAULT');assert.equal(r.options.disabled,true);r.w.SaveNewSortOrder();assert.equal(r.calls.some(c=>c[0]==='sort'),false);
 let escaped=0;r.w.document.onkeydown=()=>escaped++;
 r.tools.input.dispatchEvent(new r.w.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));assert.equal(escaped,0);assert.equal(r.tools.query,'');assert.equal(r.options.disabled,false);
 r.w.AppState('EDITING');r.search('sam');r.tools.reset();assert.equal(r.options.disabled,true);r.w.AppState('DEFAULT');assert.equal(r.options.disabled,false);r.w.SaveNewSortOrder();assert.equal(r.calls.filter(c=>c[0]==='sort').length,1);
 r.w.document.body.dispatchEvent(new r.w.KeyboardEvent('keydown',{key:' ',bubbles:true,cancelable:true}));assert.equal(escaped,0);
});
test('density persists per browser and filtering reacts to updated summaries and newly inserted rows',async t=>{
 const r=await fixture(t,'comfortable');assert.equal(r.w.document.documentElement.dataset.ycsDensity,'comfortable');r.tools.density.value='compact';r.tools.density.dispatchEvent(new r.w.Event('change'));assert.equal(r.w.localStorage.getItem('ycs.rundownDensity'),'compact');
 r.search('new player');r.chip.querySelector('.truncate').textContent='NEW PLAYER';await r.flush();assert.equal(r.chip.hidden,false);
 const copy=r.chip.cloneNode(true);copy.id='new';r.tools.list.append(copy);await r.flush();assert.equal(copy.hidden,false);assert.equal(r.tools.count.textContent,'2 / 3');
 r.search('round');r.w.focusRow(0);assert.equal(r.w.getFocusedRow(),r.ticker);r.search('new player');r.tools.reveal(r.ticker);assert.equal(r.tools.query,'');assert.equal(r.ticker.hidden,false);
});
