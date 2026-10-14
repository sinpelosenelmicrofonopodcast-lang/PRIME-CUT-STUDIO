import {enqueueEmail} from '@/lib/email';
import {hashToken} from '@/lib/db';
import {NextResponse} from 'next/server';import {cookies} from 'next/headers';import {operationsSession,audit} from '@/lib/operations-db';import {roleCan} from '@/lib/operations-policy';import {normalizedEmail} from '@/lib/db';import {workspaceForm} from '@/lib/workspace-request';import {sameOriginRedirect} from '@/lib/auth';import {uuid,dateOnly} from '@/lib/workspace-policy';import {projectBookEnabled} from '@/lib/project-book-policy';import {createProductionProject} from '@/lib/project-book-db';
export const runtime='nodejs';
export async function POST(req:Request){
 if(!projectBookEnabled())return new Response('Production workspace upgrade not active yet',{status:503});
 const f=await workspaceForm(req,128000);if(f instanceof Response)return f;
 const actor=await operationsSession();if(!actor||!roleCan(actor.role,'projects.create'))return new Response('Forbidden',{status:403});
 const name=(f.get('name')||'').trim(),email=normalizedEmail(f.get('email')||''),title=(f.get('title')||'').trim(),location=(f.get('location')||'').trim(),brief=(f.get('brief')||'').trim(),requestId=f.get('requestId')||'';
 if(!uuid(requestId)||name.length<2||name.length>120||title.length<2||title.length>140||location.length>200||brief.length>20000||(email&&(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)))return new Response('Check the client name, project title and email',{status:400});
 let eventDate,planningDate,deliveryDate;try{eventDate=dateOnly(f.get('eventDate')||'');planningDate=dateOnly(f.get('planningDate')||'');deliveryDate=dateOnly(f.get('deliveryDate')||'');}catch{return new Response('Invalid date',{status:400});}
 if(planningDate&&deliveryDate&&deliveryDate<planningDate)return new Response('Delivery cannot precede planning',{status:400});
 const result=await createProductionProject(requestId,actor.accountId,{name,email,title,location,eventDate,planningDate,deliveryDate,brief});
 if(result.token&&email)(await cookies()).set('primecuts_collaborator_flash',JSON.stringify({id:result.id,email,token:result.token}),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/team',maxAge:300});
 if(result.token&&email)await enqueueEmail('invite:'+hashToken(result.token),email,'invitation','en','/client/activate/'+result.token,true);
 await audit('project.create','project',result.id,actor,result.id);
 return NextResponse.redirect(sameOriginRedirect(req,'/team/projects/'+result.id+'?created=1'),303);
}
