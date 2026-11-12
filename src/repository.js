export const categories=['Infrastruktur','Pendidikan','Kesehatan','Ekonomi','Lingkungan'];
export const statuses=['Diajukan','Dibahas','Diprioritaskan','Ditunda','Ditolak'];
export const score=p=>p.urgency*8+p.benefit*7+p.readiness*5;
export function list(store,filters={},publicOnly=false) {
 const clauses=['p.archived=?'],args=[filters.archived==='1'?1:0];
 if(publicOnly)clauses.push('p.published=1','p.archived=0');
 if(filters.q){clauses.push('(instr(lower(p.title),lower(?))>0 OR instr(lower(p.location),lower(?))>0)');args.push(String(filters.q).slice(0,120),String(filters.q).slice(0,120));}
 for(const key of ['category','status','area_id'])if(filters[key]){clauses.push('p.'+key+'=?');args.push(String(filters[key]));}
 return store.all('SELECT p.*,a.name area,u.name owner FROM proposals p JOIN areas a ON a.id=p.area_id JOIN users u ON u.id=p.owner_id WHERE '+clauses.join(' AND ')+' ORDER BY (p.urgency*8+p.benefit*7+p.readiness*5) DESC,p.id',...args).map(p=>({...p,score:score(p)}));
}
export function summary(proposals) {
 return {count:proposals.length,cost:proposals.reduce((sum,p)=>sum+p.cost,0),prioritized:proposals.filter(p=>p.status==='Diprioritaskan').length,areas:new Set(proposals.map(p=>p.area_id)).size};
}
export function grouped(proposals,areas){return areas.map(area=>({id:area.id,...summary(proposals.filter(p=>p.area_id===area.id))}));}
