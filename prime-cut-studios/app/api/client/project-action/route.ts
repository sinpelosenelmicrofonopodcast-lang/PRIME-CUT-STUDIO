import {scheduleMail} from '@/lib/email';
import {NextResponse} from 'next/server';
import {clientAuthenticated} from '@/lib/client-auth';import {clientCanAccess} from '@/lib/db';
import {sameOriginRedirect} from '@/lib/auth';import {workspaceForm} from '@/lib/workspace-request';
import {uuid} from '@/lib/workspace-policy';import {clientProjectAction,clientCanReview} from '@/lib/workspace-db';
export const runtime='nodejs';
export async function POST(req:Request){
 const f=await workspaceForm(req);if(f instanceof Response)return f;
 const account=await clientAuthenticated();if(!account)return new Response('Unauthorized',{status:401});
 const id=f.get('projectId')||'',eventId=f.get('eventId')||'',kind=f.get('kind')||'',stageId=f.get('stageId')||'',body=(f.get('body')||'').trim(),revision=Number(f.get('revision'));
 if(!uuid(id)||!uuid(eventId)||!['message','approval','revision_requested'].includes(kind)||body.length<1||body.length>3000||(kind!=='message'&&(!uuid(stageId)||!Number.isSafeInteger(revision)||revision<0)))return new Response('Invalid action',{status:400});
 if(!await clientCanAccess(account.id,id))return new Response('Not found',{status:404});
 if(!await clientCanReview(account.id,id))return new Response('Read-only project access',{status:403});
 if(!await clientProjectAction(eventId,id,account.id,stageId||null,revision,kind,body))return new Response('This review changed. Reload the project before responding.',{status:409});
 scheduleMail();
 return NextResponse.redirect(sameOriginRedirect(req,'/client/projects/'+id+'?saved=1'),303);
}
