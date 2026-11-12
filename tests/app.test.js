import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createApp} from '../src/core/app.js';
import {addUser} from '../src/core/auth.js';
import {score} from '../src/repository.js';
const proposal={title:'Usulan uji',description:'Uraian pengujian',category:'Infrastruktur',area_id:1,location:'Lokasi pengujian',cost:'150000000',urgency:5,benefit:4,readiness:3,internal_note:'Catatan terbatas'};
async function setup(file=':memory:'){
 const {app,store}=createApp(file),password=randomBytes(20).toString('hex');
 if(!store.get('SELECT id FROM users LIMIT 1'))for(const [username,role] of [['admin','Admin'],['petugas','Petugas'],['lain','Petugas']])addUser(store,{username,name:username,role,password});
 const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
 const base='http://127.0.0.1:'+server.address().port;
 async function request(url,method='GET',body,headers={}){return fetch(base+'/api/'+url,{method,headers:{'Content-Type':'application/json',...headers},body:method==='GET'?undefined:JSON.stringify(body||{})});}
 async function login(username){const r=await request('login','POST',{username,password});assert.equal(r.status,200);const data=await r.json();return {cookie:r.headers.get('set-cookie').split(';')[0],'X-CSRF-Token':data.csrf};}
 return {store,request,login,stop:async()=>{await new Promise(r=>server.close(r));store.close();}};
}
test('CRUD, peran, publikasi aman dan keputusan musyawarah atomik',async()=>{
 const e=await setup();try{
  const admin=await e.login('admin'),staff=await e.login('petugas'),other=await e.login('lain');
  assert.equal((await e.request('state')).status,401);
  assert.equal((await e.request('areas','POST',{name:'Dusun Uji'},staff)).status,403);
  assert.equal((await e.request('areas','POST',{name:'Dusun Uji'},admin)).status,201);
  assert.equal((await e.request('areas/1','PUT',{name:'Wilayah Uji'},admin)).status,200);
  assert.equal((await e.request('proposals','POST',proposal,staff)).status,201);
  assert.equal((await (await e.request('public')).json()).proposals.length,0);
  assert.equal((await e.request('proposals/1','PUT',proposal,other)).status,403);
  assert.equal((await e.request('proposals/1','PUT',{...proposal,title:'Usulan diperbarui'},staff)).status,200);
  assert.equal((await e.request('proposals/1/publication','POST',{published:true},staff)).status,403);
  assert.equal((await e.request('proposals/1/publication','POST',{published:true},admin)).status,200);
  const publicRow=(await (await e.request('public?q=diperbarui&area_id=1&category=Infrastruktur')).json()).proposals[0];
  assert.equal(publicRow.score,83);assert.equal(publicRow.internal_note,undefined);assert.equal(publicRow.owner_id,undefined);assert.equal(publicRow.owner,undefined);
  assert.equal((await e.request('proposals/1/deliberations','POST',{meeting_date:'2026-11-12',result:'Diprioritaskan',note:'Hasil uji'},staff)).status,403);
  assert.equal((await e.request('proposals/1/deliberations','POST',{meeting_date:'2026-11-12',result:'Diprioritaskan',note:'Hasil uji'},admin)).status,200);
  assert.equal((await e.request('proposals/1','PUT',proposal,staff)).status,403);
  assert.equal((await (await e.request('proposals/1/history','GET',undefined,staff)).json()).length,1);
  const report=await e.request('export','GET',undefined,admin);assert.equal(report.status,200);assert.match(await report.text(),/Hasil uji/);
  assert.equal((await e.request('areas/1','DELETE',{},admin)).status,400);
  assert.equal((await e.request('proposals/1','DELETE',{},admin)).status,200);
  assert.equal((await (await e.request('public')).json()).proposals.length,0);
  assert.equal((await e.request('proposals/1/restore','POST',{},admin)).status,200);
  assert.equal(e.store.get('SELECT published FROM proposals WHERE id=1').published,0);
  assert.deepEqual(e.store.all('PRAGMA foreign_key_check'),[]);
 }finally{await e.stop();}
});
test('validasi skor, uang bulat, tanggal, CSRF dan rollback keputusan gagal',async()=>{
 const e=await setup();try{
  const auth=await e.login('admin');await e.request('areas','POST',{name:'Uji'},auth);
  assert.equal(score({urgency:1,benefit:1,readiness:1}),20);assert.equal(score({urgency:5,benefit:5,readiness:5}),100);
  for(const values of [{urgency:6},{cost:'1.5'},{cost:-1},{title:''},{area_id:999}])assert.equal((await e.request('proposals','POST',{...proposal,...values},auth)).status,400);
  assert.equal((await e.request('proposals','POST',proposal,{cookie:auth.cookie})).status,403);
  await e.request('proposals','POST',proposal,auth);
  assert.equal((await e.request('proposals/1/deliberations','POST',{meeting_date:'2026-02-30',result:'Dibahas',note:'Uji'},auth)).status,400);
  e.store.db.exec("CREATE TRIGGER reject_status BEFORE UPDATE OF status ON proposals BEGIN SELECT RAISE(ABORT,'Uji rollback'); END");
  assert.equal((await e.request('proposals/1/deliberations','POST',{meeting_date:'2026-11-12',result:'Dibahas',note:'Uji'},auth)).status,400);
  assert.equal(e.store.get('SELECT count(*) n FROM deliberations').n,0);
  assert.equal((await e.request('areas','POST',{name:'Duplikat'}, {...auth,Origin:'https://lain.example'})).status,403);
 }finally{await e.stop();}
});
test('SQLite persisten, sesi tersimpan sebagai hash dan logout membatalkan akses',async()=>{
 const file=path.join(mkdtempSync(path.join(tmpdir(),'musrenbang-')),'app.sqlite');let e=await setup(file);let cookie;
 try{const auth=await e.login('admin');cookie=auth;await e.request('areas','POST',{name:'Wilayah Persisten'},auth);assert.notEqual(e.store.get('SELECT token FROM sessions').token,auth.cookie.split('=')[1]);}finally{await e.stop();}
 e=await setup(file);try{assert.equal((await e.request('state','GET',undefined,cookie)).status,200);assert.equal(e.store.get('PRAGMA integrity_check').integrity_check,'ok');assert.equal((await e.request('logout','POST',{},cookie)).status,200);assert.equal((await e.request('state','GET',undefined,cookie)).status,401);}finally{await e.stop();}
});
