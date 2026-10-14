import 'server-only';
import nodemailer from 'nodemailer';
import {after} from 'next/server';
import {comm,filters,rpc,commEnabled} from '@/lib/communications-db';
import {seal,unseal} from '@/lib/private-token';
import {emailTemplate,intakeEmail,type IntakeNotice,type EmailLanguage} from '@/lib/email-templates';
import {publicSiteOrigin} from '@/lib/site-origin';
import {smtpConfiguration} from '@/lib/smtp-config';
type Mail={id:string;dedupe_key:string;recipient:string;template:string;language:EmailLanguage;payload:IntakeNotice & {path?:string;secure?:string};attempts:number};
export function mailConfigured(){return smtpConfiguration()!==null;}
export async function enqueueEmail(key:string,to:string,template:string,language:EmailLanguage='en',path='/client',sensitive=false){if(!commEnabled())return;try{await comm('pc_email_outbox?on_conflict=dedupe_key',{method:'POST',headers:{Prefer:'resolution=ignore-duplicates,return=minimal'},body:JSON.stringify({dedupe_key:key,recipient:to.toLowerCase(),template,language,payload:sensitive?{secure:seal({path})}:{path},...(sensitive?{expires_at:new Date(Date.now()+50*60000).toISOString()}:{})})});scheduleMail();}catch{/* The saved business action remains successful; admin can inspect its audit record. */}}
/** Owner notification is independent of the customer confirmation; both use the existing outbox. */
export async function enqueueOwnerIntake(key:string,payload:IntakeNotice){
 if(!commEnabled())return;
 const recipient=(process.env.PRIMECUTS_OWNER_INTAKE_EMAIL||'admin@getbdg.com').trim().toLowerCase();
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient))return;
 try{await comm('pc_email_outbox?on_conflict=dedupe_key',{method:'POST',headers:{Prefer:'resolution=ignore-duplicates,return=minimal'},body:JSON.stringify({dedupe_key:'owner:'+key,recipient,template:'owner_intake',language:'es',payload:{...payload,path:'/team'}})});scheduleMail();}catch{/* Saved inquiry is always authoritative. */}
}
export function scheduleMail(){if(commEnabled())after(async()=>{try{await drainMail(6);}catch{/* Persisted outbox remains queued. No sensitive content is logged. */}});}
export async function drainMail(max=10){let processed=0;for(let i=0;i<max;i++){const [m]=await rpc<Mail[]>('pc_claim_email',{});if(!m)break;const patch=(state:string,error:string|null=null,extra:object={})=>comm(filters('pc_email_outbox',{id:'eq.'+m.id}),{method:'PATCH',body:JSON.stringify({state,last_error:error,updated_at:new Date().toISOString(),lease_until:null,...extra})});
 const smtp=smtpConfiguration();
 if(!smtp){await patch('blocked','SMTP_NOT_CONFIGURED',{attempts:Math.max(0,m.attempts-1),next_attempt:new Date(Date.now()+3600000).toISOString()});continue;}
 const suppressed=await comm<{email:string}[]>(filters('pc_email_suppressions',{email:'eq.'+m.recipient,select:'email'}));if(suppressed.length){await patch('bounced','RECIPIENT_SUPPRESSED');continue;}
 const path=m.payload.secure?unseal<{path:string}>(m.payload.secure)?.path:m.payload.path;
 if(!path||!path.startsWith('/')||path.startsWith('//')){await patch('failed','INVALID_LINK');continue;}
 const content=m.template==='owner_intake'?intakeEmail(m.payload,publicSiteOrigin()+path):emailTemplate(m.template,m.language,publicSiteOrigin()+path);
 const transport=nodemailer.createTransport({...smtp.transport,connectionTimeout:10000,greetingTimeout:10000,socketTimeout:20000});
 try{const sent=await transport.sendMail({from:smtp.from,replyTo:m.template==='owner_intake'&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m.payload.email||'')?m.payload.email:smtp.replyTo,to:m.recipient,messageId:`<${m.id}@primecutstudiostx.com>`,...content});await patch(sent.accepted.length?'accepted':'failed',sent.accepted.length?null:'SMTP_REJECTED',{provider_id:sent.messageId});processed++;}
 catch(e){const err=e as {responseCode?:number;code?:string;command?:string;response?:string};if(err.responseCode&&err.responseCode>=400&&err.responseCode<500&&m.attempts<3)await patch('queued','SMTP_TEMPORARY',{next_attempt:new Date(Date.now()+m.attempts*300000).toISOString()});else if(err.responseCode&&err.responseCode>=500){const bounced=/5\.1\.1/.test(err.response||'');await patch(bounced?'bounced':'failed','SMTP_PERMANENT');if(bounced)await comm('pc_email_suppressions?on_conflict=email',{method:'POST',headers:{Prefer:'resolution=ignore-duplicates'},body:JSON.stringify({email:m.recipient,reason:'hard_bounce'})});}else if(err.code==='EAUTH'||err.code==='EDNS'||err.command==='CONN')await patch(m.attempts<3?'queued':'failed',err.code,{next_attempt:new Date(Date.now()+m.attempts*300000).toISOString()});else await patch('unknown','CHECK_PROVIDER_BEFORE_RETRY');}finally{transport.close();}
 }return processed;}
