import {list,summary,grouped,categories,statuses} from './repository.js';
import {saveArea,saveProposal,deliberate,requireProposal} from './service.js';
import {integer,csv,fail} from './core/validate.js';
export function routes(app,store,guard) {
 app.get('/api/public',(req,res)=>{
  const proposals=list(store,req.query,true).map(p=>({id:p.id,title:p.title,description:p.description,category:p.category,area:p.area,location:p.location,cost:p.cost,status:p.status,score:p.score,area_id:p.area_id}));
  res.json({proposals,summary:summary(proposals),areas:store.all('SELECT * FROM areas ORDER BY name'),categories,statuses});
 });
 app.get('/api/state',guard(),(req,res)=>{
  const proposals=list(store,req.query),all=list(store);
  const areas=store.all('SELECT * FROM areas ORDER BY name');
  res.json({proposals,summary:summary(all),areas,groups:grouped(all,areas),categories,statuses});
 });
 app.post('/api/areas',guard(['Admin']),(req,res)=>{saveArea(store,req.body);res.status(201).json({message:'Wilayah ditambahkan.'});});
 app.put('/api/areas/:id',guard(['Admin']),(req,res)=>{saveArea(store,req.body,integer(req.params.id,'ID wilayah',1));res.json({message:'Wilayah diperbarui.'});});
 app.delete('/api/areas/:id',guard(['Admin']),(req,res)=>{store.run('DELETE FROM areas WHERE id=?',integer(req.params.id,'ID wilayah',1));res.json({message:'Wilayah dihapus.'});});
 app.post('/api/proposals',guard(),(req,res)=>res.status(201).json({id:saveProposal(store,req.user,req.body),message:'Usulan diajukan.'}));
 app.put('/api/proposals/:id',guard(),(req,res)=>{saveProposal(store,req.user,req.body,integer(req.params.id,'ID usulan',1));res.json({message:'Usulan diperbarui.'});});
 app.delete('/api/proposals/:id',guard(),(req,res)=>{
  const id=integer(req.params.id,'ID usulan',1);requireProposal(store,id,req.user,true);
  store.run('UPDATE proposals SET archived=1,published=0 WHERE id=?',id);res.json({message:'Usulan diarsipkan; riwayat tetap disimpan.'});
 });
 app.post('/api/proposals/:id/restore',guard(['Admin']),(req,res)=>{const id=integer(req.params.id,'ID usulan',1);requireProposal(store,id,req.user);store.run('UPDATE proposals SET archived=0 WHERE id=?',id);res.json({message:'Usulan dipulihkan sebagai data internal.'});});
 app.post('/api/proposals/:id/publication',guard(['Admin']),(req,res)=>{
  const id=integer(req.params.id,'ID usulan',1),p=requireProposal(store,id,req.user);
  if(typeof req.body.published!=='boolean'||p.archived)fail('Pilihan publikasi tidak valid.');
  store.run('UPDATE proposals SET published=? WHERE id=?',req.body.published?1:0,id);res.json({message:'Pilihan publikasi diperbarui.'});
 });
 app.post('/api/proposals/:id/deliberations',guard(['Admin']),(req,res)=>{deliberate(store,req.user,integer(req.params.id,'ID usulan',1),req.body);res.json({message:'Keputusan dan status tersimpan bersama.'});});
 app.get('/api/proposals/:id/history',guard(),(req,res)=>{const id=integer(req.params.id,'ID usulan',1);requireProposal(store,id,req.user);res.json(store.all('SELECT d.*,u.name actor FROM deliberations d JOIN users u ON u.id=d.actor_id WHERE proposal_id=? ORDER BY d.id DESC',id));});
 app.get('/api/export',guard(),(req,res)=>{
  const proposals=list(store,req.query),rows=[['Usulan','Kategori','Wilayah','Lokasi','Estimasi rupiah','Skor prioritas','Status','Tanggal musyawarah','Hasil','Catatan musyawarah']];
  for(const p of proposals){const history=store.all('SELECT * FROM deliberations WHERE proposal_id=? ORDER BY id',p.id);if(history.length)for(const h of history)rows.push([p.title,p.category,p.area,p.location,p.cost,p.score,p.status,h.meeting_date,h.result,h.note]);else rows.push([p.title,p.category,p.area,p.location,p.cost,p.score,p.status,'','','']);}
  res.setHeader('Content-Disposition','attachment; filename=hasil-musyawarah.csv');res.type('text/csv').send(csv(rows));
 });
}
