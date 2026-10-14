import {clientAuthenticated} from '@/lib/client-auth';
import {clientCanAccess} from '@/lib/db';
import {workspaceEnabled,uuid} from '@/lib/workspace-policy';
import {operationsSession,requireCapability,castingPhotoApplication,castingById} from '@/lib/operations-db';
import {projectTalent,talentById} from '@/lib/workspace-db';
import {readCastingPhoto} from '@/lib/casting-photos';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(req:Request,{params}:{params:Promise<{kind:string;id:string;index:string}>}){
 const deny=()=>new Response('Not found',{status:404});
 const {kind,id,index}=await params,project=new URL(req.url).searchParams.get('project');
 if(!workspaceEnabled()||!uuid(id)||!['application','talent'].includes(kind)||! /^[0-2]$/.test(index))return deny();
 let paths:string[]=[];
 if(kind==='application'){
  if(project)return deny();
  const a=await castingPhotoApplication(id);if(!a)return deny();const call=await castingById(a.casting_call_id);if(!call||!await requireCapability('casting.read',call.project_id))return deny();paths=a.photo_paths;
 }else if(project){
  if(!uuid(project))return deny();
  const staff=await requireCapability('projects.read',project);
  if(!staff){const client=await clientAuthenticated();if(!client||!await clientCanAccess(client.id,project))return deny();}
  const selected=(await projectTalent(project)).find(t=>t.id===id);if(!selected)return deny();paths=selected.photo_paths;
 }else{
  const actor=await operationsSession();if(!actor||!['owner','administrator'].includes(actor.role))return deny();
  const talent=await talentById(id);if(!talent?.bank_consent)return deny();paths=talent.photo_paths;
 }
 const path=paths[Number(index)];if(!path)return deny();
 try{const bytes=await readCastingPhoto(path);return new Response(bytes,{headers:{'Content-Type':'image/jpeg','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"sandbox; default-src 'none'",'X-Robots-Tag':'noindex, nofollow'}});}catch{return deny();}
}
