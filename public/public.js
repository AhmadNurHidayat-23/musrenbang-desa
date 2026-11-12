import {$,api,values,options,money,message} from './core.js';
import {renderRecords} from './render.js';
async function refresh(){
 const s=await api('public?'+new URLSearchParams(values($('#filters'))));
 options($('#area-filter'),s.areas,'Semua wilayah');options($('#category-filter'),s.categories.map(c=>({id:c,name:c})),'Semua kategori');options($('#status-filter'),s.statuses.map(s=>({id:s,name:s})),'Semua status');
 $('#total').textContent=s.summary.count;$('#priority').textContent=s.summary.prioritized;$('#cost').textContent=money(s.summary.cost);
 renderRecords($('#records'),s.proposals);
}
$('#filters').addEventListener('submit',e=>{e.preventDefault();refresh().catch(e=>message(e.message));});
refresh().catch(e=>message(e.message));
