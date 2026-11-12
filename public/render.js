import {el,button,money} from './core.js';
export function renderRecords(target,proposals,actions) {
 target.replaceChildren();
 for(const p of proposals){
  const article=el('article',undefined,'record');
  const tags=el('div',undefined,'tags');tags.append(el('span',p.category,'badge'),el('span',p.status,'badge'),el('span','Skor '+p.score+'/100','badge'));
  article.append(tags,el('h3',p.title),el('p',p.description,'muted description'),el('p',p.area+' / '+p.location+' · '+money(p.cost),'meta'));
  if(actions){article.append(el('p','Urgensi '+p.urgency+' · Manfaat '+p.benefit+' · Kesiapan '+p.readiness,'meta'),el('p','Pengusul: '+p.owner+' · '+(p.published?'Dipublikasikan':'Internal'),'meta'));if(p.internal_note)article.append(el('p','Internal: '+p.internal_note,'muted description'));const controls=el('div',undefined,'actions');for(const [text,action] of actions(p))controls.append(button(text,action));article.append(controls);}
  target.append(article);
 }
 if(!proposals.length)target.append(el('p','Belum ada usulan yang sesuai dengan tampilan ini.','empty'));
}
