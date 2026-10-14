import {scheduleMail} from '@/lib/email';
import {NextResponse} from 'next/server';import {workspaceForm} from '@/lib/workspace-request';import {uuid,dateOnly} from '@/lib/workspace-policy';import {projectBookEnabled,bookKinds,validateBookMetadata} from '@/lib/project-book-policy';import {saveBookBlock,bookBlock,staffBookNote} from '@/lib/project-book-db';import {requireCapability,audit} from '@/lib/operations-db';import {getProject} from '@/lib/db';import {sameOriginRedirect} from '@/lib/auth';
export const runtime='nodejs';
export async function POST(req:Request){
 if(!projectBookEnabled())return new Response('Production workspace upgrade not active yet',{status:503});
 const f=await workspaceForm(req,128000);if(f instanceof Response)return f;
 if(f.get('action')==='comment'){const projectId=f.get('projectId')||'',blockId=f.get('blockId')||'',body=(f.get('body')||'').trim();if(!uuid(projectId)||!uuid(blockId)||body.length<1||body.length>3000)return new Response('Invalid note',{status:400});const actor=await requireCapability('projects.write',projectId);if(!actor)return new Response('Forbidden',{status:403});const block=await bookBlock(blockId);if(!block||block.project_id!==projectId)return new Response('Not found',{status:404});await staffBookNote(projectId,blockId,block.revision,actor.accountId,body);scheduleMail();
 return NextResponse.redirect(sameOriginRedirect(req,'/team/projects/'+projectId+'?saved=1#production-book'),303);}
 const projectId=f.get('projectId')||'',blockId=f.get('blockId')||'',revision=Number(f.get('revision')),kind=f.get('kind')||'',title=(f.get('title')||'').trim(),body=(f.get('body')||'').trim(),metadata=validateBookMetadata(f.get('metadata')||'');
 if(!uuid(projectId)||!uuid(blockId)||!Number.isSafeInteger(revision)||revision<0||!bookKinds.includes(kind as typeof bookKinds[number])||title.length<2||title.length>160||body.length>20000||!metadata)return new Response('Check this section and its links/colors',{status:400});
 const actor=await requireCapability('projects.write',projectId);if(!actor)return new Response('Forbidden',{status:403});
 if(!await getProject(projectId))return new Response('Not found',{status:404});
 let planningDate,deliveryDate;try{planningDate=dateOnly(f.get('planningDate')||'');deliveryDate=dateOnly(f.get('deliveryDate')||'');}catch{return new Response('Invalid dates',{status:400});}
 if(planningDate&&deliveryDate&&deliveryDate<planningDate)return new Response('Invalid planning / delivery order',{status:400});
 const ok=await saveBookBlock(blockId,projectId,revision,{kind,title,body,metadata:{...metadata,planningDate,deliveryDate},client_visible:f.get('visible')==='yes',requires_approval:f.get('approval')==='yes'},actor.accountId);
 if(!ok)return new Response('This section changed. Reload before saving.',{status:409});
 await audit('project_book.save','project_block',blockId,actor,projectId,{revision:revision+1});
 scheduleMail();
 return NextResponse.redirect(sameOriginRedirect(req,'/team/projects/'+projectId+'?saved=1#production-book'),303);
}
