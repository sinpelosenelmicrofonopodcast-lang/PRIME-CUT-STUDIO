import {clientProjectSection} from '@/lib/client-project-presentation';
import {scheduleMail} from '@/lib/email';
import {NextResponse} from 'next/server';import {workspaceForm} from '@/lib/workspace-request';import {uuid} from '@/lib/workspace-policy';import {projectBookEnabled} from '@/lib/project-book-policy';import {respondBookBlock} from '@/lib/project-book-db';import {clientAuthenticated} from '@/lib/client-auth';import {clientCanAccess} from '@/lib/db';import {clientCanReview} from '@/lib/workspace-db';import {sameOriginRedirect} from '@/lib/auth';
export const runtime='nodejs';
export async function POST(req:Request){
 if(!projectBookEnabled())return new Response('Production workspace upgrade not active yet',{status:503});
 const f=await workspaceForm(req);if(f instanceof Response)return f;
 const a=await clientAuthenticated();if(!a)return new Response('Unauthorized',{status:401});
 const projectId=f.get('projectId')||'',blockId=f.get('blockId')||'',id=f.get('responseId')||'',revision=Number(f.get('revision')),kind=f.get('kind')||'',body=(f.get('body')||'').trim();
 if(!uuid(projectId)||!uuid(blockId)||!uuid(id)||!Number.isSafeInteger(revision)||revision<1||!['agree','changes','comment'].includes(kind)||body.length<1||body.length>3000)return new Response('Write your note or decision before sending',{status:400});
 if(!await clientCanAccess(a.id,projectId))return new Response('Not found',{status:404});
 if(!await clientCanReview(a.id,projectId))return new Response('Read-only access',{status:403});
 if(!await respondBookBlock(id,projectId,blockId,revision,a.id,kind,body))return new Response('This section is private or has changed. Reload to review the latest version.',{status:409});
 scheduleMail();
 return NextResponse.redirect(sameOriginRedirect(req,'/client/projects/'+projectId+'?saved=1&section='+clientProjectSection(f.get('returnSection')||'proposal')+'#block-'+blockId),303);
}
