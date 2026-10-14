import {enqueueEmail} from '@/lib/email';
import {hashToken,normalizedEmail,getProject} from '@/lib/db';
import {randomBytes} from 'node:crypto';
import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {workspaceForm} from '@/lib/workspace-request';
import {projectBookEnabled} from '@/lib/project-book-policy';
import {uuid} from '@/lib/workspace-policy';
import {requireCapability,audit} from '@/lib/operations-db';
import {saveProjectClientInvitation} from '@/lib/project-book-db';
import {sameOriginRedirect} from '@/lib/auth';
export const runtime='nodejs';
export async function POST(req:Request){
 if(!projectBookEnabled())return new Response('Upgrade not active',{status:503});
 const f=await workspaceForm(req);if(f instanceof Response)return f;
 const id=f.get('projectId')||'',email=normalizedEmail(f.get('email')||''),expected=normalizedEmail(f.get('expectedEmail')||'');
 if(!uuid(id)||email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return new Response('Escribe el correo real del cliente.',{status:400});
 const actor=await requireCapability('projects.write',id);if(!actor)return new Response('Forbidden',{status:403});
 const p=await getProject(id);if(!p)return new Response('Not found',{status:404});
 // Correction changes only this project's recipient and membership, never Auth email.
 if(normalizedEmail(p.client_email)!==expected)return new Response('El correo cambió. Recarga el proyecto antes de invitar.',{status:409});
 const changed=email!==expected;
 if(changed&&expected&&(!['owner','administrator'].includes(actor.role)||f.get('confirmChange')!=='yes'))return new Response('Administración debe confirmar el cambio de cliente y la revocación del acceso anterior.',{status:400});
 const token=randomBytes(32).toString('base64url');
 if(!await saveProjectClientInvitation(id,expected,email,hashToken(token)))return new Response('El cliente cambió. Recarga el proyecto.',{status:409});
 (await cookies()).set('primecuts_collaborator_flash',JSON.stringify({id,email,token}),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/team',maxAge:300});
 await enqueueEmail('invite:'+hashToken(token),email,'invitation','en','/client/activate/'+token,true);
 await audit(changed?'project.client_email_change':'project.client_invite','project',id,actor,id,{recipientChanged:changed});
 return NextResponse.redirect(sameOriginRedirect(req,'/team/projects/'+id+'?tab=settings&saved=1#project-client'),303);
}
