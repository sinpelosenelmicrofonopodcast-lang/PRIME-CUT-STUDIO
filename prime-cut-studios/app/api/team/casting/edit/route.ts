import {boundedForm} from '@/lib/form-request';
import {NextResponse} from 'next/server';
import {requestIsSameOrigin,sameOriginRedirect} from '@/lib/auth';
import {castingById,requireCapability,updateCastingCall,audit} from '@/lib/operations-db';
import {safeHttpsImage,type PresentationData} from '@/lib/casting-editor';

export const runtime='nodejs';
const textField=(f:FormData,k:string,max:number)=>{const value=f.get(k);return typeof value==='string'?value.trim().slice(0,max+1):''};
const lines=(v:string)=>v.split(/\r?\n/g).map(s=>s.replace(/^\s*[-•*]\s*/, '').trim()).filter(Boolean).slice(0,25).map(s=>s.slice(0,220));
const uuid=/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;
function fail(message:string,status=400){return new Response(message,{status});}
export async function POST(request:Request){
 if(!requestIsSameOrigin(request))return fail('Origen inválido',403);
 if(Number(request.headers.get('content-length')||0)>24000)return fail('Formulario demasiado grande',413);
 const form=await boundedForm(request);if(form instanceof Response)return form;
 const id=textField(form,'id',64);
 if(!uuid.test(id))return fail('Convocatoria inválida');
 const call=await castingById(id);
 if(!call)return fail('Convocatoria no encontrada',404);
 const actor=await requireCapability('casting.write',call.project_id);
 if(!actor)return fail('No tienes permiso para editar este casting',403);
 const title=textField(form,'title',160),description=textField(form,'description',4200),requirements=textField(form,'requirements',4200);
 const location=textField(form,'location',150),pay=textField(form,'payDetails',500);
 const shortTitle=textField(form,'shortTitle',160),subtitle=textField(form,'subtitle',180),tag=textField(form,'tag',160),tone=textField(form,'tone',160),story=textField(form,'story',2500);
 const image=textField(form,'image',500),status=textField(form,'status',15),paymentStatus=textField(form,'paymentStatus',20),closesAt=textField(form,'closesAt',10);
 if(title.length<3||title.length>160||description.length>4200||requirements.length>4200||location.length>150||
 pay.length>500||!['draft','open','closed','archived'].includes(status)||
 !['paid','unpaid','pending'].includes(paymentStatus)||
 (paymentStatus==='paid'&&pay.length<8)||
 (image&&!/^\/casting\/[a-zA-Z0-9/_-]+\.(jpg|jpeg|png|webp)$/.test(image)&&!safeHttpsImage(image))||
 (closesAt&&!/^\d{4}-\d{2}-\d{2}$/.test(closesAt))||
 [shortTitle,subtitle,tag,tone,story].some((v,i)=>v.length>[160,180,160,160,2500][i]))return fail('Revisa los campos y la compensación indicada.');
 const facts:Array<{label:string;value:string}>=[];
 for(let n=0;n<4;n++){const label=textField(form,'factLabel'+n,60),value=textField(form,'factValue'+n,140);
  if(label&&value)facts.push({label,value});
 }
 const presentation:PresentationData={
  image,shortTitle,subtitle,tag,tone,story,paymentStatus:paymentStatus as 'paid'|'unpaid'|'pending',
  roles:lines(textField(form,'roles',4500)),look:lines(textField(form,'look',4500)),
  shoot:lines(textField(form,'shoot',4500)),notes:lines(textField(form,'notes',4500)),facts
 };
 try{
  const saved=await updateCastingCall(id,{title,description,requirements,location:location||null,pay_details:pay||null,
   closes_at:closesAt?closesAt+'T23:59:59Z':null,status:status as 'draft'|'open'|'closed'|'archived',presentation});
  if(saved!==1)return fail('No se guardaron los cambios',409);
  await audit('casting.edit','casting_call',id,actor,call.project_id,{fields:['copy','pay','roles','image','public_status'],status});
  return NextResponse.redirect(sameOriginRedirect(request,'/team/casting/'+id+'/edit?saved=1'),303);
 }catch(e){console.error('Casting save failed',e);return fail('No se pudo guardar la convocatoria',503);}
}
