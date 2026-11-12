import {$,api,values,options,money,message,fill,bindAuth,user,el,button} from './core.js';
import {renderRecords} from './render.js';
const form=$('#proposal-form'),filters=$('#filters');
async function act(path,method,body){try{const result=await api(path,method,body);await refresh();message(result.message);return true;}catch(e){message(e.message);return false;}}
async function history(p){try{const rows=await api('proposals/'+p.id+'/history'),target=$('#history-records');target.replaceChildren();for(const h of rows){const row=el('div',undefined,'record');row.append(el('strong',h.meeting_date+' / '+h.result),el('p',h.note,'description muted'),el('p','Dicatat oleh '+h.actor,'meta'));target.append(row);}if(!rows.length)target.append(el('p','Belum ada hasil musyawarah.','empty'));$('#history').showModal();}catch(e){message(e.message);}}
function actions(p){
 const controls=[['Riwayat',()=>history(p)]];
 if(p.archived){if(user.role==='Admin')controls.push(['Pulihkan',()=>act('proposals/'+p.id+'/restore','POST')]);return controls;}
 if(user.role==='Admin'||p.owner_id===user.id&&p.status==='Diajukan')controls.push(['Edit usulan',()=>{fill(form,p);$('#form-title').textContent='Ubah usulan';form.scrollIntoView({block:'start'});}],['Arsipkan',()=>act('proposals/'+p.id,'DELETE')]);
 if(user.role==='Admin')controls.push(['Musyawarah',()=>{fill($('#deliberation-form'),{id:p.id,meeting_date:new Date().toLocaleDateString('sv-SE'),result:'Dibahas',note:''});$('#decision-error').textContent='';$('#deliberation').showModal();}],[p.published?'Tarik dari publik':'Publikasikan',()=>{if(confirm('Halaman publik menampilkan judul, uraian, wilayah, lokasi, estimasi biaya, skor dan status. Pastikan uraian bebas data pribadi. Lanjutkan?'))act('proposals/'+p.id+'/publication','POST',{published:!p.published});}]);
 return controls;
}
async function refresh(){
 const s=await api('state?'+new URLSearchParams(values(filters)));
 options($('#area'),s.areas,'Pilih wilayah');options($('#category'),s.categories.map(c=>({id:c,name:c})),'Pilih kategori');options($('#area-filter'),s.areas,'Semua wilayah');options($('#category-filter'),s.categories.map(c=>({id:c,name:c})),'Semua kategori');options($('#status-filter'),s.statuses.map(s=>({id:s,name:s})),'Semua status');
 $('#total').textContent=s.summary.count;$('#priority').textContent=s.summary.prioritized;$('#cost').textContent=money(s.summary.cost);$('#export').href='/api/export?'+new URLSearchParams(values(filters));
 renderRecords($('#records'),s.proposals,actions);
 const target=$('#areas');target.replaceChildren();
 for(const area of s.areas){const group=s.groups.find(g=>g.id===area.id);const row=el('div',undefined,'row'),info=el('div');info.append(el('strong',area.name),el('p',group.count+' usulan aktif · '+group.prioritized+' prioritas · '+money(group.cost),'meta'));row.append(info);if(user.role==='Admin'){const controls=el('div',undefined,'actions');controls.append(button('Edit wilayah',()=>fill($('#area-form'),area)),button('Hapus wilayah',()=>{if(confirm('Hapus wilayah ini? Wilayah yang terkait usulan tidak dapat dihapus.'))act('areas/'+area.id,'DELETE');}));row.append(controls);}target.append(row);}
 $('#area-form').hidden=user.role!=='Admin';
}
filters.addEventListener('submit',e=>{e.preventDefault();refresh().catch(e=>message(e.message));});
form.addEventListener('submit',async e=>{e.preventDefault();const data=values(form);if(await act('proposals'+(data.id?'/'+data.id:''),data.id?'PUT':'POST',data)){form.reset();$('#form-title').textContent='Usulan baru';}});
form.addEventListener('reset',()=>{if(form.dataset.filling)return;$('#form-title').textContent='Usulan baru';setTimeout(()=>{form.elements.id.value='';},0);});
$('#area-form').addEventListener('submit',async e=>{e.preventDefault();const f=e.currentTarget,data=values(f);if(await act('areas'+(data.id?'/'+data.id:''),data.id?'PUT':'POST',data))f.reset();});
$('#area-form').addEventListener('reset',e=>{const f=e.currentTarget;if(f.dataset.filling)return;setTimeout(()=>{f.elements.id.value='';},0);});
$('#deliberation-form').addEventListener('submit',async e=>{e.preventDefault();const data=values(e.currentTarget);try{await api('proposals/'+data.id+'/deliberations','POST',data);$('#deliberation').close();await refresh();message('Hasil musyawarah dicatat.');}catch(e){$('#decision-error').textContent=e.message;}});
$('#close-history').addEventListener('click',()=>$('#history').close());$('#close-deliberation').addEventListener('click',()=>$('#deliberation').close());
bindAuth(refresh).catch(e=>message(e.message));
