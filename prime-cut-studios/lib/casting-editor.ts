import {castingPresentation,type CastingVisual} from './casting-presentation';

export type PresentationData=Partial<Pick<CastingVisual,'image'|'subtitle'|'shortTitle'|'tone'|'tag'|'story'|'roles'|'look'|'shoot'|'notes'|'facts'>> & {
 paymentStatus?:'paid'|'unpaid'|'pending';
};
type PublicCasting={id:string;presentation?:PresentationData|null;pay_details?:string|null};
const statuses=new Set(['paid','unpaid','pending']);
export function presentationFor(c:PublicCasting):CastingVisual|undefined{
 const base=castingPresentation[c.id];
 const saved=c.presentation&&typeof c.presentation==='object'&&!Array.isArray(c.presentation)?c.presentation:{};
 if(!base&&!Object.keys(saved).length)return undefined;
 const str=(field:keyof PresentationData,limit=1600)=>{
  const value=saved[field];
  return typeof value==='string'?value.trim().slice(0,limit):(base?String(base[field as keyof CastingVisual]||''):'');
 };
 const list=(field:'roles'|'look'|'shoot'|'notes')=>{
  const x=saved[field];const fallback=base?.[field]||[];
  return Array.isArray(x)?x.filter(y=>typeof y==='string').map(y=>y.trim().slice(0,220)).filter(Boolean).slice(0,25):fallback;
 };
 const facts=Array.isArray(saved.facts)?saved.facts.filter(x=>x&&typeof x==='object'&&typeof x.label==='string'&&typeof x.value==='string').slice(0,6).map(x=>({label:x.label.slice(0,60),value:x.value.slice(0,140)})):(base?.facts||[]);
 const rawStatus=saved.paymentStatus;
 const status=typeof rawStatus==='string'&&statuses.has(rawStatus)?rawStatus:base?.compensated===true?'paid':base?.compensated===false?'unpaid':'pending';
 const image=str('image',500);
 const validImage=/^\/casting\/[a-zA-Z0-9/_-]+\.(jpg|jpeg|png|webp)$/.test(image)||safeHttpsImage(image);
 return {
 image:validImage?image:'',
 subtitle:str('subtitle',180),shortTitle:str('shortTitle',160),tone:str('tone',160),tag:str('tag',160),
 story:str('story',2500),roles:list('roles'),look:list('look'),shoot:list('shoot'),notes:list('notes'),facts,
 paymentLabel:status==='paid'?'Casting remunerado':status==='unpaid'?'Casting no remunerado':'Compensación por confirmar',
 paymentDetail:c.pay_details?.trim()||'Condiciones de compensación por confirmar antes de aceptar el papel.',
 compensated:status==='paid'?true:status==='unpaid'?false:null
 };
}
export function safeHttpsImage(value:string){
 try{
  const u=new URL(value);
  return u.protocol==='https:'&&!u.username&&!u.password&&u.hostname.includes('.')&&
   !['localhost','127.0.0.1','0.0.0.0'].includes(u.hostname)&&!/(^|\.)(localhost|local|internal)$/.test(u.hostname)&&
   !/^(?:10|127|192\.168|169\.254|172\.(?:1[6-9]|2\d|3[01]))\./.test(u.hostname)&&
   !u.hash&&value.length<=500;
 }catch{return false;}
}
