import {NextResponse} from 'next/server';
import {workspaceForm} from '@/lib/workspace-request';
import {requireCapability} from '@/lib/operations-db';
import {projectBookEnabled} from '@/lib/project-book-policy';
import {uuid,dateOnly} from '@/lib/workspace-policy';
import {manageFinance,moneyCents} from '@/lib/project-finance';
import {sameOriginRedirect} from '@/lib/auth';
import {scheduleMail} from '@/lib/email';
export const runtime='nodejs';
export async function POST(req:Request){
 if(!projectBookEnabled())return new Response('Project documents unavailable',{status:503});
 const f=await workspaceForm(req);if(f instanceof Response)return f;
 const project=f.get('projectId')||'',action=f.get('action')||'',expected=Number(f.get('revision'));
 if(!uuid(project)||!f.has('revision')||!Number.isSafeInteger(expected)||expected<0||!['issue','verify','receipt','confirm'].includes(action))return new Response('Datos inválidos.',{status:400});
 const actor=await requireCapability(action==='verify'?'contracts.write':action==='confirm'?'projects.write':'finance.write',project);
 if(!actor||action==='issue'&&!await requireCapability('contracts.read',project)||action==='confirm'&&!await requireCapability('finance.read',project))return new Response('Forbidden',{status:403});
 let input:object={};
 if(action==='issue'){
  const proposal=f.get('proposal')||'',contract=f.get('contract')||'',invoice=f.get('invoice')||'',number=(f.get('number')||'').trim(),total=moneyCents(f.get('total')||''),deposit=moneyCents(f.get('deposit')||'');
  if(![proposal,contract,invoice].every(uuid)||contract===invoice||number.length<2||number.length>80||total===null||total<1||deposit===null||deposit>total)return new Response('Revisa los documentos, número e importes de la factura.',{status:400});
  input={proposal,contract,invoice,number,total,deposit};
 }else if(action==='verify'){
  const signed=f.get('signed')||'';if(!uuid(signed)||f.get('verified')!=='yes')return new Response('Adjunta el contrato firmado y confirma su verificación.',{status:400});input={signed};
 }else if(action==='receipt'){
  const id=f.get('receiptId')||'',amount=moneyCents(f.get('amount')||''),reference=(f.get('reference')||'').trim();let date;try{date=dateOnly(f.get('date')||'');}catch{return new Response('Fecha inválida.',{status:400});}
  if(!uuid(id)||amount===null||amount<1||reference.length<2||reference.length>160||!date||f.get('verified')!=='yes')return new Response('Verifica el pago recibido, fecha, importe y referencia.',{status:400});input={id,amount,reference,date};
 }else if(f.get('verified')!=='yes')return new Response('Confirma disponibilidad de la fecha antes de reservar.',{status:400});
 let result:string;try{result=await manageFinance(project,expected,action,input,actor.accountId);}catch{return new Response('No se guardó el cambio. Revisa el número de factura o vuelve a intentar.',{status:500});}
 if(result!=='ok')return new Response(({proposal_pending:'La propuesta vigente necesita aprobación del cliente.',invalid_document:'Usa documentos PDF compartidos de este proyecto.',invalid_payment:'El importe supera el saldo o la fecha del pago es futura.',not_ready:'Falta contrato verificado, depósito recibido o fecha disponible.',locked:'Este acuerdo tiene firma o pagos; no se puede reemplazar.',conflict:'Los datos cambiaron o la referencia ya existe. Recarga antes de guardar.'} as Record<string,string>)[result]||'No se pudo guardar.',{status:result==='not_found'?404:409});
 scheduleMail();const destination='/team/projects/'+project+'?tab=finance&saved=1';
 return req.headers.get('accept')?.includes('application/json')?NextResponse.json({ok:true,redirect:destination}):NextResponse.redirect(sameOriginRedirect(req,destination),303);
}
