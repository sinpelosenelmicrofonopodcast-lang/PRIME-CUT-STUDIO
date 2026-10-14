import {enqueueEmail} from '@/lib/email';
import {hashToken} from '@/lib/db';
import {publicSiteOrigin} from '@/lib/site-origin';
import {NextResponse} from 'next/server';import {cookies} from 'next/headers';import {workspaceForm} from '@/lib/workspace-request';import {sameOriginRedirect} from '@/lib/auth';import {uuid} from '@/lib/workspace-policy';import {requireCapability,audit} from '@/lib/operations-db';import {getProject,normalizedEmail} from '@/lib/db';import {inviteCollaborator,projectMembers,revokeCollaborator,revokeProjectInvite} from '@/lib/workspace-db';
export const runtime='nodejs';
export async function POST(req:Request){
 const f=await workspaceForm(req);if(f instanceof Response)return f;
 const id=f.get('projectId')||'';if(!uuid(id))return new Response('Invalid project',{status:400});
 const actor=await requireCapability('projects.write',id);if(!actor)return new Response('Forbidden',{status:403});
 const p=await getProject(id);if(!p)return new Response('Not found',{status:404});
 if(f.get('action')==='invite'){
 const email=normalizedEmail(f.get('email')||''),role=f.get('role');
 if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!['viewer','reviewer'].includes(role||'')||email===normalizedEmail(p.client_email))return new Response('Enter a collaborator email and limited role',{status:400});
 const token=await inviteCollaborator(id,email,role as 'viewer'|'reviewer');
 (await cookies()).set('primecuts_collaborator_flash',JSON.stringify({id,email,token}),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/team',maxAge:300});
 await enqueueEmail('invite:'+hashToken(token),email,'invitation','en','/client/activate/'+token,true);
 await audit('collaborator.invite','project',id,actor,id,{role});
 }else if(f.get('action')==='revoke_invite'){
 const tokenHash=f.get('tokenHash')||'';if(!/^[a-f0-9]{64}$/.test(tokenHash))return new Response('Invalid invitation',{status:400});
 await revokeProjectInvite(id,tokenHash);await audit('collaborator.invite_revoke','project',id,actor,id);
 }else if(f.get('action')==='revoke'){
 const accountId=f.get('accountId')||'';if(!uuid(accountId))return new Response('Invalid member',{status:400});
 const member=(await projectMembers(id)).find(m=>m.account_id===accountId);
 if(!member?.email||normalizedEmail(member.email)===normalizedEmail(p.client_email))return new Response('Primary client access cannot be removed here',{status:400});
 await revokeCollaborator(id,accountId,member.email);await audit('collaborator.revoke','account',accountId,actor,id);
 }else return new Response('Invalid action',{status:400});
 const target=sameOriginRedirect(req,'/team/projects/'+id+'?tab=settings&saved=1');
 // JSON avoids fetch following the 303 to a full RSC page before reporting success.
 // Native form submissions keep the standard 303 for progressive enhancement.
 if(req.headers.get('accept')?.includes('application/json'))return NextResponse.json({ok:true,redirect:target.pathname+target.search+target.hash});
 return NextResponse.redirect(target,303);
}
