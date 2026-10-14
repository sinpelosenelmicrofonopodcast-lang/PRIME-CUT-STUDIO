import {NextResponse} from 'next/server';import {sameOriginRedirect} from '@/lib/auth';import {workspaceForm} from '@/lib/workspace-request';import {uuid,dateOnly} from '@/lib/workspace-policy';
import {operationsSession,audit} from '@/lib/operations-db';import {getProject} from '@/lib/db';import {selectTalent,revokeSelection} from '@/lib/workspace-db';
export const runtime='nodejs';
export async function POST(req:Request){
 const f=await workspaceForm(req);if(f instanceof Response)return f;
 const actor=await operationsSession();if(!actor||!['owner','administrator'].includes(actor.role))return new Response('Forbidden',{status:403});
 const projectId=f.get('projectId')||'',talentId=f.get('talentId')||'',action=f.get('action');
 if(!uuid(projectId)||!uuid(talentId))return new Response('Invalid selection',{status:400});
 if(!await getProject(projectId))return new Response('Not found',{status:404});
 if(action==='revoke'){if(!await revokeSelection(projectId,talentId))return new Response('No active selection for this talent and project',{status:409});}
 else if(action==='share'){
 let date;try{date=dateOnly(f.get('expires')||'');}catch{return new Response('Invalid date',{status:400});}
 const expires=date?new Date(date+'T23:59:59Z'):null;
 if(!expires||expires.getTime()<=Date.now()||expires.getTime()>Date.now()+90*86400000)return new Response('Choose an expiration in the next 90 days',{status:400});
 if(!await selectTalent(projectId,talentId,actor.accountId,expires.toISOString()))return new Response('Talent has not authorized this selection',{status:409});
 }else return new Response('Invalid action',{status:400});
 await audit('talent.'+action,'talent',talentId,actor,projectId);
 const target=sameOriginRedirect(req,'/team/talent?saved=1');
 if(req.headers.get('accept')?.includes('application/json'))return NextResponse.json({ok:true,redirect:target.pathname+target.search+target.hash});
 return NextResponse.redirect(target,303);
}
