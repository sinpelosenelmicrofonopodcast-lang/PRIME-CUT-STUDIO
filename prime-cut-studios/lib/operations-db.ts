import {restResponse} from '@/lib/rest-response';
/** Server-only persistence for PrimeCuts operations. All reads and writes use a secret server key.
 * Do not import this module from Client Components. Never grant public/anon table access.
 */
import {randomBytes,randomUUID} from 'node:crypto';
import {serverHeaders,hashToken,normalizedEmail} from '@/lib/db';
import {adminAuthenticated} from '@/lib/auth';
import {clientAuthenticated} from '@/lib/client-auth';
import {scopeCan,staffRoleValid,type StaffRole,type Capability,type Scope} from '@/lib/operations-policy';
import type {PresentationData} from '@/lib/casting-editor';
const base=()=>process.env.SUPABASE_URL||'';
async function rest<T>(path:string,init:RequestInit={}):Promise<T>{
 const r=await fetch(base()+'/rest/v1/'+path,{...init,cache:'no-store',headers:serverHeaders({'Content-Type':'application/json',...(init.headers as Record<string,string>||{})})});
 if(!r.ok)throw new Error('Operations database error '+r.status);
 return restResponse<T>(r);
}
function encoded(table:string,filters:Record<string,string>){return table+'?'+new URLSearchParams(filters)}
async function rows<T>(table:string,filters:Record<string,string>):Promise<T[]>{return rest<T[]>(encoded(table,filters))}
async function insert<T>(table:string,value:object){const r=await rest<T[]>(table+'?select=*',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(value)});return r[0]}
async function update(table:string,filter:Record<string,string>,value:object){const r=await rest<{id:string}[]>(encoded(table,{...filter,select:'id'}),{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(value)});return r.length}
export type Staff={account_id:string;role:StaffRole;active:boolean;email?:string};
export type OperationSession={accountId:string|null;role:StaffRole;scope:Scope;legacyOwner:boolean};
export async function operationsSession():Promise<OperationSession|null>{
 if(await adminAuthenticated())return {accountId:null,role:'owner',legacyOwner:true,scope:{role:'owner',active:true,assignedProjectIds:[]}};
 const client=await clientAuthenticated();
 if(!client)return null;
 const ms=await rows<Staff>('pc_staff_members',{account_id:'eq.'+client.id,select:'account_id,role,active',limit:'1'});
 const member=ms[0];
 if(!member||!member.active||!staffRoleValid(member.role))return null;
 const assignments=await rows<{project_id:string}>('pc_staff_projects',{account_id:'eq.'+client.id,select:'project_id',limit:'500'});
 return {accountId:client.id,role:member.role,legacyOwner:false,scope:{role:member.role,active:true,assignedProjectIds:assignments.map(x=>x.project_id)}};
}
export async function requireCapability(ability:Capability,projectId?:string){
 const access=await operationsSession();
 return access&&scopeCan(access.scope,ability,projectId)?access:null;
}
export async function staffMembers(){
 const members=await rows<Staff>('pc_staff_members',{select:'account_id,role,active',order:'created_at.desc',limit:'200'});
 if(!members.length)return members;
 const accounts=await rows<{id:string;email:string}>('pc_client_accounts',{select:'id,email',id:'in.('+members.map(m=>m.account_id).join(',')+')',limit:'200'});
 const emails=new Map(accounts.map(a=>[a.id,a.email]));
 return members.map(m=>({...m,email:emails.get(m.account_id)||''}));
}
export async function createStaffInvite(email:string,role:StaffRole,projectId:string|null){
 if(!staffRoleValid(role)||role==='owner')throw new Error('INVALID_ROLE');
 const token=randomBytes(32).toString('base64url');
 await insert('pc_staff_invites',{token_hash:hashToken(token),email:normalizedEmail(email),role,project_id:projectId,expires_at:new Date(Date.now()+7*86400000).toISOString()});
 return token;
}
export async function staffInvite(token:string){
 if(!/^[a-zA-Z0-9_-]{35,100}$/.test(token))return null;
 return (await rows<{email:string;role:StaffRole;project_id:string|null}>('pc_staff_invites',{token_hash:'eq.'+hashToken(token),redeemed_at:'is.null',expires_at:'gt.'+new Date().toISOString(),select:'email,role,project_id',limit:'1'}))[0]||null;
}
export async function acceptStaffInvite(token:string,passwordHash:string|null,accountId:string|null){
 const r=await rest<{account_id:string;role:StaffRole}[]>('rpc/pc_accept_staff_invite',{method:'POST',body:JSON.stringify({p_token_hash:hashToken(token),p_new_password_hash:passwordHash,p_existing_account_id:accountId})});
 return r[0]||null;
}
export type OpsTask={id:string;project_id:string;title:string;description:string;status:'todo'|'doing'|'blocked'|'done';assigned_account_id:string|null;due_at:string|null;created_at:string};
export async function getTasks(projectIds:string[],all:boolean){
 if(!all&&!projectIds.length)return [];
 return rows<OpsTask>('pc_operational_tasks',{select:'*',...(all?{}:{project_id:'in.('+projectIds.join(',')+')'}),order:'created_at.desc',limit:'300'});
}
export async function createTask(projectId:string,title:string,description:string,dueAt:string|null){
 return insert<OpsTask>('pc_operational_tasks',{id:randomUUID(),project_id:projectId,title,description,due_at:dueAt,status:'todo'});
}
export async function taskById(id:string){return (await rows<OpsTask>('pc_operational_tasks',{id:'eq.'+id,select:'*',limit:'1'}))[0]||null}
export async function setTaskStatus(id:string,status:OpsTask['status']){return update('pc_operational_tasks',{id:'eq.'+id},{status})}
export type CastingCall={id:string;project_id:string;title:string;description:string;requirements:string;location:string|null;pay_details:string|null;presentation?:PresentationData|null;status:'draft'|'open'|'closed'|'archived';closes_at:string|null;created_at:string};
export type CastingApplication={id:string;casting_call_id:string;full_name:string;email:string;phone:string|null;city:string|null;portfolio_url:string|null;headshot_url:string|null;photo_paths:string[];experience:string|null;availability:string|null;status:string;private_notes:string;created_at:string};
export async function castingCalls(publicOnly=false){return rows<CastingCall>('pc_casting_calls',{select:'*',...(publicOnly?{status:'eq.open'}:{}),order:'created_at.desc',limit:'100'})}
export async function castingById(id:string,publicOnly=false){return (await rows<CastingCall>('pc_casting_calls',{id:'eq.'+id,select:'*',...(publicOnly?{status:'eq.open'}:{}),limit:'1'}))[0]||null}
export async function createCastingCall(d:Omit<CastingCall,'id'|'created_at'>){return insert<CastingCall>('pc_casting_calls',{...d,id:randomUUID()})}
export async function changeCastingStatus(id:string,status:CastingCall['status']){return update('pc_casting_calls',{id:'eq.'+id},{status,published_at:status==='open'?new Date().toISOString():null})}
export async function updateCastingCall(id:string,d:Pick<CastingCall,'title'|'description'|'requirements'|'location'|'pay_details'|'closes_at'|'presentation'|'status'>){return update('pc_casting_calls',{id:'eq.'+id},{...d,published_at:d.status==='open'?new Date().toISOString():null})}
export async function updateCastingPresentation(id:string,presentation:PresentationData){return update('pc_casting_calls',{id:'eq.'+id},{presentation})}
export async function castingApplications(callIds:string[]){
 if(!callIds.length)return [];
 return rows<CastingApplication>('pc_casting_applications',{select:'id,casting_call_id,full_name,email,phone,city,portfolio_url,headshot_url,photo_paths,experience,availability,status,private_notes,created_at',casting_call_id:'in.('+callIds.join(',')+')',order:'created_at.desc',limit:'300'});
}
export async function castingApplicationById(id:string){return (await rows<CastingApplication>('pc_casting_applications',{id:'eq.'+id,select:'id,casting_call_id,status',limit:'1'}))[0]||null}
export async function castingApplyCount(ipHash:string){return rows<{id:string}>('pc_casting_applications',{ip_hash:'eq.'+ipHash,created_at:'gte.'+new Date(Date.now()-60*60000).toISOString(),select:'id',limit:'5'})}
export async function applyCasting(data:object){return insert('pc_casting_applications',{id:randomUUID(),...data})}
export async function castingStatusUpdate(id:string,status:string,privateNotes:string){return update('pc_casting_applications',{id:'eq.'+id},{status,private_notes:privateNotes})}
export type EquipmentOverride={asset_id:string;rental_approved:boolean;disabled:boolean;photo_url:string|null;daily_rate_cents:number|null;item_notes:string};
export async function equipmentOverrides(){return rows<EquipmentOverride>('pc_equipment_overrides',{select:'asset_id,rental_approved,disabled,photo_url,daily_rate_cents,item_notes',limit:'500'})}
export async function setEquipmentOverride(d:EquipmentOverride){
 return insert('pc_equipment_overrides',{...d,updated_at:new Date().toISOString()});
}
export async function upsertEquipmentOverride(d:EquipmentOverride){
 const exists=await rows<{asset_id:string}>('pc_equipment_overrides',{asset_id:'eq.'+d.asset_id,select:'asset_id',limit:'1'});
 if(exists.length)return rest('pc_equipment_overrides?asset_id=eq.'+encodeURIComponent(d.asset_id),{method:'PATCH',body:JSON.stringify({...d,updated_at:new Date().toISOString()})});
 return insert('pc_equipment_overrides',{...d,updated_at:new Date().toISOString()});
}
export async function audit(action:string,subjectType:string,subjectId:string|null,actor:OperationSession|null,projectId:string|null,details:object={}){
 await insert('pc_operational_audit',{actor_id:actor?.accountId||null,actor_kind:actor?.legacyOwner?'owner':actor?.role||'public',project_id:projectId,action,subject_type:subjectType,subject_id:subjectId,details});
}

/** Update only the photograph; preserve concurrent rental controls and notes. */
export async function setEquipmentPhoto(asset_id:string,photo_url:string){return rest('pc_equipment_overrides?on_conflict=asset_id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({asset_id,photo_url})});}

export async function castingPhotoApplication(id:string){return (await rows<Pick<CastingApplication,'id'|'casting_call_id'|'photo_paths'>>('pc_casting_applications',{id:'eq.'+id,select:'id,casting_call_id,photo_paths',limit:'1'}))[0]||null;}
export async function castingPhotosSaved(call:string,email:string,paths:string[]){const found=await rows<{photo_paths:string[]}>('pc_casting_applications',{casting_call_id:'eq.'+call,email:'eq.'+email,select:'photo_paths',limit:'1'});return found.some(r=>paths.every(p=>r.photo_paths.includes(p)));}
