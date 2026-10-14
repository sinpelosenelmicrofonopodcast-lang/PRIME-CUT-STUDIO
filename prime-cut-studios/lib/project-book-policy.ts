import {dateOnly,safeProfessionalUrl} from '@/lib/workspace-policy';
export const projectBookEnabled=()=>process.env.PRIMECUTS_PROJECT_BOOK_V2==='true';
export const bookKinds=['brief','location','cast','script','palette','shot_list','schedule','deliverables','document','reference','custom'] as const;
export type BookKind=(typeof bookKinds)[number];
export const bookLabels:Record<BookKind,string>={brief:'Resumen y concepto',location:'Locaciones',cast:'Actores y personajes',script:'Libreto',palette:'Paleta de colores',shot_list:'Plan de tomas',schedule:'Itinerario',deliverables:'Entregables',document:'Documento',reference:'Referencias / moodboard',custom:'Otros detalles'};
export type Shot={scene:string;framing:string;action:string;movement:string;notes:string};
export type BookMetadata={shots?:Shot[];colors:{name:string;hex:string}[];links:{label:string;url:string}[];clientTitle?:string;subtitle?:string;decisionType?:'location';shootDate?:string;datesConfirmed?:boolean};
export function validateBookMetadata(raw:string):BookMetadata|null{
 try{const parsed=JSON.parse(raw||'{"colors":[],"links":[]}');if(!Array.isArray(parsed.colors)||!Array.isArray(parsed.links)||parsed.colors.length>16||parsed.links.length>12)return null;
 if(parsed.colors.some((c:unknown)=>!c||typeof c!=='object'||typeof (c as {name:unknown}).name!=='string'||(c as {name:string}).name.length>80||!/^#[0-9a-f]{6}$/i.test((c as {hex:string}).hex)))return null;
 if(parsed.links.some((l:unknown)=>!l||typeof l!=='object'||typeof (l as {label:unknown}).label!=='string'||!(l as {label:string}).label.trim()||(l as {label:string}).label.length>120||typeof (l as {url:unknown}).url!=='string'||!(l as {url:string}).url||(l as {url:string}).url.length>1000||!safeProfessionalUrl((l as {url:string}).url)))return null;
 if((parsed.clientTitle!==undefined&&(typeof parsed.clientTitle!=='string'||parsed.clientTitle.length>160))||(parsed.subtitle!==undefined&&(typeof parsed.subtitle!=='string'||parsed.subtitle.length>160))||(parsed.decisionType!==undefined&&parsed.decisionType!=='location')||(parsed.datesConfirmed!==undefined&&typeof parsed.datesConfirmed!=='boolean')||(parsed.shootDate!==undefined&&(typeof parsed.shootDate!=='string'||!dateOnly(parsed.shootDate))))return null;
 if(parsed.shots!==undefined&&(!Array.isArray(parsed.shots)||parsed.shots.length>60||parsed.shots.some((shot:unknown)=>!shot||typeof shot!=='object'||['scene','framing','action','movement','notes'].some(key=>typeof (shot as Record<string,unknown>)[key]!=='string'||((shot as Record<string,string>)[key]).length>1000))))return null;
 return {shots:parsed.shots?.map((shot:Shot)=>({scene:shot.scene,framing:shot.framing,action:shot.action,movement:shot.movement,notes:shot.notes})),clientTitle:parsed.clientTitle,subtitle:parsed.subtitle,decisionType:parsed.decisionType,shootDate:parsed.shootDate,datesConfirmed:parsed.datesConfirmed,colors:parsed.colors.map((c:{name:string;hex:string})=>({name:c.name,hex:c.hex})),links:parsed.links.map((l:{label:string;url:string})=>({label:l.label,url:l.url}))};
 }catch{return null;}
}
