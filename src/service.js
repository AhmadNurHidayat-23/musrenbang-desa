import {text,integer,choice,date,fail} from './core/validate.js';
import {categories,statuses} from './repository.js';
export function requireProposal(store,id,user,edit=false) {
 const proposal=store.get('SELECT * FROM proposals WHERE id=?',integer(id,'ID usulan',1));
 if(!proposal)fail('Usulan tidak ditemukan.',404);
 if(edit&&user.role!=='Admin'&&(proposal.owner_id!==user.id||proposal.status!=='Diajukan'||proposal.archived))fail('Petugas hanya dapat mengubah usulan sendiri yang masih Diajukan.',403);
 return proposal;
}
export function saveArea(store,data,id=0) {
 const name=text(data.name,'Nama dusun / wilayah',80);
 if(id){if(!store.get('SELECT id FROM areas WHERE id=?',id))fail('Wilayah tidak ditemukan.',404);store.run('UPDATE areas SET name=? WHERE id=?',name,id);}
 else store.run('INSERT INTO areas(name) VALUES(?)',name);
}
export function saveProposal(store,user,data,id=0) {
 return store.transaction(()=>{
  const old=id?requireProposal(store,id,user,true):null;
  if(old?.archived)fail('Pulihkan usulan sebelum mengubahnya.');
  const area=integer(data.area_id,'Dusun / wilayah',1);
  if(!store.get('SELECT id FROM areas WHERE id=?',area))fail('Wilayah tidak ditemukan.');
  const values=[text(data.title,'Judul usulan'),text(data.description,'Uraian',2000),choice(data.category,categories,'Kategori'),area,text(data.location,'Lokasi',160),integer(data.cost,'Estimasi biaya (rupiah)',0,1000000000000),integer(data.urgency,'Urgensi',1,5),integer(data.benefit,'Manfaat',1,5),integer(data.readiness,'Kesiapan',1,5),text(data.internal_note??'','Catatan internal',1000,false)];
  const proposedCost=store.get('SELECT coalesce(sum(cost),0) total FROM proposals WHERE archived=0 AND id<>?',id).total+values[5];
  if(!Number.isSafeInteger(proposedCost))fail('Total estimasi biaya melampaui batas perhitungan.');
  if(id){store.run('UPDATE proposals SET title=?,description=?,category=?,area_id=?,location=?,cost=?,urgency=?,benefit=?,readiness=?,internal_note=? WHERE id=?',...values,id);return id;}
  return Number(store.run('INSERT INTO proposals(title,description,category,area_id,location,cost,urgency,benefit,readiness,internal_note,owner_id) VALUES(?,?,?,?,?,?,?,?,?,?,?)',...values,user.id).lastInsertRowid);
 });
}
export function deliberate(store,user,id,data) {
 if(user.role!=='Admin')fail('Hanya Admin dapat mencatat keputusan musyawarah.',403);
 store.transaction(()=>{
  const p=requireProposal(store,id,user);
  if(p.archived)fail('Usulan dalam arsip.');
  const result=choice(data.result,statuses.filter(s=>s!=='Diajukan'),'Hasil musyawarah');
  const when=date(data.meeting_date),note=text(data.note,'Catatan musyawarah',2000);
  store.run('INSERT INTO deliberations(proposal_id,meeting_date,result,note,actor_id) VALUES(?,?,?,?,?)',id,when,result,note,user.id);
  store.run('UPDATE proposals SET status=? WHERE id=?',result,id);
 });
}
