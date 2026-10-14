import {restResponse} from '@/lib/rest-response';
import {enqueueEmail} from '@/lib/email';
/** Server-only: callers MUST authorize the account/project before privileged reads. */
import {randomBytes} from 'node:crypto';
import {serverHeaders,hashToken} from '@/lib/db';
import {stageTemplate,consentVersion,type StageState} from '@/lib/workspace-policy';
async function api<T>(path:string,init:RequestInit={}):Promise<T>{
 const r=await fetch((process.env.SUPABASE_URL||'')+'/rest/v1/'+path,{...init,cache:'no-store',headers:serverHeaders({'Content-Type':'application/json',...(init.headers as Record<string,string>||{})})});
 if(!r.ok)throw new Error('Workspace persistence failed: '+r.status);
 return restResponse<T>(r);
}
const path=(table:string,filters:Record<string,string>)=>table+'?'+new URLSearchParams(filters);
export type Stage={id:string;project_id:string;position:number;title:string;description:string;status:StageState;planned_start:string|null;planned_end:string|null;dates_confirmed:boolean;actual_start:string|null;actual_end:string|null;next_step:string;responsible:string;revision:number;updated_at:string};
export type ProjectEvent={id:string;project_id:string;stage_id:string|null;actor_kind:'client'|'staff';kind:string;body:string;client_visible:boolean;details?:{previous?:{planned_start?:string|null;planned_end?:string|null};updated?:{planned_start?:string|null;planned_end?:string|null}};created_at:string};
export async function projectStages(projectId:string){return api<Stage[]>(path('pc_project_stages',{project_id:'eq.'+projectId,select:'*',order:'position.asc'}));}
export async function stageById(id:string){return (await api<Stage[]>(path('pc_project_stages',{id:'eq.'+id,select:'*',limit:'1'})))[0]||null;}
export async function projectEvents(projectId:string,client=true){return api<ProjectEvent[]>(path('pc_project_events',{project_id:'eq.'+projectId,...(client?{client_visible:'eq.true'}:{}),select:'id,project_id,stage_id,actor_kind,kind,body,client_visible,details,created_at',order:'created_at.desc',limit:'100'}));}
export async function initializeStages(projectId:string){if((await projectStages(projectId)).length)return;return api('pc_project_stages?on_conflict=project_id,position',{method:'POST',headers:{Prefer:'resolution=ignore-duplicates,return=minimal'},body:JSON.stringify(stageTemplate.map(([title,description],i)=>({project_id:projectId,position:i+1,title,description})))});}
export async function updateStage(stageId:string,revision:number,values:object,actorId:string|null){return api<boolean>('rpc/pc_update_stage',{method:'POST',body:JSON.stringify({p_stage_id:stageId,p_expected_revision:revision,p_values:values,p_actor_id:actorId})});}
export async function clientProjectAction(eventId:string,projectId:string,accountId:string,stageId:string|null,revision:number,kind:string,body:string){return api<boolean>('rpc/pc_client_project_action',{method:'POST',body:JSON.stringify({p_event_id:eventId,p_project_id:projectId,p_account_id:accountId,p_stage_id:stageId,p_revision:revision,p_kind:kind,p_body:body})});}
export async function staffMessage(projectId:string,actorId:string|null,body:string,visible:boolean){return api('pc_project_events',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({project_id:projectId,actor_id:actorId,actor_kind:'staff',kind:'message',body,client_visible:visible})});}
export type ClientProfile={company:string;phone:string;language:'en'|'es';contact_method:'email'|'phone'|'portal';preferences:string};
export async function clientProfile(accountId:string){return (await api<ClientProfile[]>(path('pc_client_profiles',{account_id:'eq.'+accountId,select:'company,phone,language,contact_method,preferences',limit:'1'})))[0]||null;}
export async function saveClientProfile(accountId:string,name:string,profile:ClientProfile){
 await api(path('pc_client_accounts',{id:'eq.'+accountId}),{method:'PATCH',body:JSON.stringify({name})});
 return api('pc_client_profiles?on_conflict=account_id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({...profile,account_id:accountId,updated_at:new Date().toISOString()})});
}
export async function privacyRequest(accountId:string,kind:string,details:string){return api('pc_privacy_requests',{method:'POST',body:JSON.stringify({account_id:accountId,kind,details})});}
export async function privacyRequests(){return api<{id:string;account_id:string|null;kind:string;details:string;status:string;created_at:string}[]>('pc_privacy_requests?select=*&order=created_at.desc&limit=100');}
export async function updatePrivacyRequest(id:string,status:string){return api(path('pc_privacy_requests',{id:'eq.'+id}),{method:'PATCH',body:JSON.stringify({status})});}
export type Talent={id:string;full_name:string;email:string;phone:string|null;city:string|null;portfolio_url:string|null;headshot_url:string|null;photo_paths:string[];experience:string|null;availability:string|null;bank_consent:boolean;client_material_consent:boolean;available:boolean;consent_version:string;created_at:string};
const talentFields='id,full_name,email,phone,city,portfolio_url,headshot_url,photo_paths,experience,availability,bank_consent,client_material_consent,available,consent_version,created_at';
export async function talentBank(){return api<Talent[]>(path('pc_talent_profiles',{select:talentFields,bank_consent:'eq.true',order:'created_at.desc',limit:'200'}));}
export async function managedTalent(token:string){if(!/^[A-Za-z0-9_-]{43}$/.test(token))return null;return (await api<Talent[]>(path('pc_talent_profiles',{select:talentFields,manage_token_hash:'eq.'+hashToken(token),manage_expires_at:'gt.'+new Date().toISOString(),limit:'1'})))[0]||null;}
export async function applyWithTalent(application:object,bank:boolean,material:boolean){const token=randomBytes(32).toString('base64url');await api('rpc/pc_apply_casting_photos',{method:'POST',body:JSON.stringify({p_application:application,p_bank:bank,p_material:bank&&material,p_token_hash:hashToken(token),p_version:consentVersion})});const a=application as {email:string;casting_call_id:string};try{await enqueueEmail('casting:'+a.casting_call_id+':'+hashToken(a.email),a.email,'casting','en','/casting');}catch{/* Application remains saved. */}return bank?token:null;}
export async function updateTalent(token:string,bank:boolean,material:boolean,available:boolean,experience:string,availability:string){return api<boolean>('rpc/pc_update_talent',{method:'POST',body:JSON.stringify({p_token_hash:hashToken(token),p_bank:bank,p_material:material,p_available:available,p_experience:experience,p_availability:availability,p_version:consentVersion})});}
export async function selectTalent(projectId:string,talentId:string,_actorId:string|null,expiresAt:string){
 // Single atomic server-only RPC: checks both consent flags and the 90-day window,
 // and reactivates an existing selection without breaking the unique constraint.
 return api<boolean>('rpc/pc_assign_project_talent',{method:'POST',body:JSON.stringify({p_project:projectId,p_talent:talentId,p_expires:expiresAt})});
}
export async function revokeSelection(projectId:string,talentId:string){
 return api<boolean>('rpc/pc_revoke_project_talent',{method:'POST',body:JSON.stringify({p_project:projectId,p_talent:talentId})});
}
export async function projectTalent(projectId:string){
 const selections=await api<{talent_id:string;expires_at:string}[]>(path('pc_talent_selections',{project_id:'eq.'+projectId,revoked_at:'is.null',expires_at:'gt.'+new Date().toISOString(),select:'talent_id,expires_at',limit:'100'}));
 if(!selections.length)return [];
 // Deliberate allowlist excludes ALL contact details and internal notes.
 return api<Pick<Talent,'id'|'full_name'|'city'|'portfolio_url'|'headshot_url'|'photo_paths'|'experience'>[]>(path('pc_talent_profiles',{id:'in.('+selections.map(s=>s.talent_id).join(',')+')',bank_consent:'eq.true',client_material_consent:'eq.true',available:'eq.true',select:'id,full_name,city,portfolio_url,headshot_url,photo_paths,experience'}));
}

export async function clientCanReview(accountId:string,projectId:string){return (await api<{account_id:string}[]>(path('pc_project_members',{account_id:'eq.'+accountId,project_id:'eq.'+projectId,member_role:'eq.reviewer',select:'account_id',limit:'1'}))).length===1;}
export async function projectMembers(projectId:string){
 const members=await api<{account_id:string;member_role:'viewer'|'reviewer'}[]>(path('pc_project_members',{project_id:'eq.'+projectId,select:'account_id,member_role',limit:'100'}));
 if(!members.length)return [];
 const accounts=await api<{id:string;name:string;email:string}[]>(path('pc_client_accounts',{id:'in.('+members.map(m=>m.account_id).join(',')+')',select:'id,name,email'}));
 return members.map(m=>({...m,...accounts.find(a=>a.id===m.account_id)}));
}
export async function inviteCollaborator(projectId:string,email:string,role:'viewer'|'reviewer'){
 const token=randomBytes(32).toString('base64url');
 // Separate collaborators from the primary client email reassignment flow.
 // The RPC creates the requested role and replaces only the same recipient's
 // pending link. Other collaborators and the primary client remain unchanged.
 const saved=await api<boolean>('rpc/pc_invite_project_collaborator',{method:'POST',body:JSON.stringify({p_project:projectId,p_email:email,p_role:role,p_hash:hashToken(token)})});
 if(!saved)throw new Error('Project not found. Refresh the project before inviting.');
 return token;
}
export async function revokeCollaborator(projectId:string,accountId:string,email:string){
 await api(path('pc_project_members',{project_id:'eq.'+projectId,account_id:'eq.'+accountId}),{method:'DELETE'});
 await api(path('pc_client_invites',{project_id:'eq.'+projectId,email:'eq.'+email,redeemed_at:'is.null'}),{method:'PATCH',body:JSON.stringify({expires_at:new Date().toISOString()})});
}
export async function projectInvites(projectId:string){return api<{token_hash:string;email:string;member_role:string;expires_at:string}[]>(path('pc_client_invites',{project_id:'eq.'+projectId,redeemed_at:'is.null',expires_at:'gt.'+new Date().toISOString(),select:'token_hash,email,member_role,expires_at',limit:'100'}));}
export async function revokeProjectInvite(projectId:string,tokenHash:string){return api(path('pc_client_invites',{project_id:'eq.'+projectId,token_hash:'eq.'+tokenHash,redeemed_at:'is.null'}),{method:'PATCH',body:JSON.stringify({expires_at:new Date().toISOString()})});}

export async function joinTalentBank(profile:object,material:boolean){const token=randomBytes(32).toString('base64url');await api('rpc/pc_join_talent_bank',{method:'POST',body:JSON.stringify({p_profile:profile,p_material:material,p_token_hash:hashToken(token),p_version:consentVersion})});return token;}

export async function talentById(id:string){return (await api<Talent[]>(path('pc_talent_profiles',{id:'eq.'+id,select:talentFields,limit:'1'})))[0]||null;}
