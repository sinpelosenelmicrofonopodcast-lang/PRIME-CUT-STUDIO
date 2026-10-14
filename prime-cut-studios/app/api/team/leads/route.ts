import {sameOriginRedirect as safeFormRedirect} from '@/lib/auth';
import {boundedForm} from '@/lib/form-request';
import {enqueueEmail} from '@/lib/email';
import {hashToken} from '@/lib/db';
import {publicSiteOrigin} from '@/lib/site-origin';
import {NextResponse} from 'next/server';import {cookies} from 'next/headers';
import {requestIsSameOrigin} from '@/lib/auth';
import {convertInquiry,issueClientInvite,getProject} from '@/lib/db';
import {operationsSession,audit} from '@/lib/operations-db';
import {roleCan} from '@/lib/operations-policy';
import {serverHeaders} from '@/lib/db';
export const runtime='nodejs';
export async function POST(req:Request){
 if(!requestIsSameOrigin(req))return new Response('Forbidden',{status:403});
 const actor=await operationsSession();if(!actor||!roleCan(actor.role,'crm.write'))return new Response('Forbidden',{status:403});
 const f=await boundedForm(req);if(f instanceof Response)return f;const id=String(f.get('id')||'');
 if(!/^[\da-f-]{36}$/i.test(id))return new Response('Invalid request',{status:400});
 const converted=await convertInquiry(id);if(!converted)return new Response('Request not found',{status:404});
 const p=await getProject(converted.projectId);if(!p)return new Response('Project missing',{status:500});
 if(actor.accountId){
  const add=await fetch(process.env.SUPABASE_URL+'/rest/v1/pc_staff_projects',{method:'POST',cache:'no-store',headers:serverHeaders({'Content-Type':'application/json','Prefer':'resolution=ignore-duplicates'}),body:JSON.stringify({account_id:actor.accountId,project_id:p.id})});
  if(!add.ok)return new Response('Project created but could not assign employee; ask owner for access',{status:500});
 }
 const token=await issueClientInvite(p.id);
 if(token){(await cookies()).set('primecuts_team_client_invite',JSON.stringify({link:publicSiteOrigin()+'/client/activate/'+token}),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/team',maxAge:300});}
 if(token)await enqueueEmail('invite:'+hashToken(token),p.client_email,'invitation','en','/client/activate/'+token,true);
 await audit('crm.convert','project',p.id,actor,p.id,{sourceInquiryId:id});
 return NextResponse.redirect(safeFormRedirect(req,'/team/leads'),303);
}