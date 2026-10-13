/** Prime Cut Studios — persistent Supabase database. Server-only: NEVER bundle the secret key in a client component. */
import { randomUUID, randomBytes, createHash } from 'node:crypto';

const baseUrl = () => process.env.SUPABASE_URL || '';
const backendKey = () => process.env.SUPABASE_SECRET_KEY || '';
export function storageConfigured() {
  return /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(baseUrl()) && backendKey().length > 20;
}
export function serverHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const key = backendKey();
  if (!storageConfigured()) throw new Error('Supabase is not configured. Set SUPABASE_URL and SUPABASE_SECRET_KEY on the server.');
  return {
    apikey: key,
    ...(key.startsWith('sb_secret_') ? {} : { Authorization: `Bearer ${key}` }),
    ...extra
  };
}
async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!storageConfigured()) throw new Error('SUPABASE_NOT_CONFIGURED');
  const response = await fetch(`${baseUrl()}${path}`, {
    ...init,
    cache: 'no-store',
    headers: serverHeaders({ 'Content-Type':'application/json', ...(init.headers as Record<string, string> || {}) })
  });
  if (!response.ok) {
    const message = (await response.text()).slice(0,400);
    throw new Error(`Supabase ${response.status}: ${message}`);
  }
  if (response.status===204) return null as T;
  return response.json() as Promise<T>;
}
function query(table: string, params: Record<string,string>): string {
  const s=new URLSearchParams(params);
  return `/rest/v1/${table}?${s.toString()}`;
}
async function getRows<T>(table:string, opts:Record<string,string>):Promise<T[]> {
  return api<T[]>(query(table,opts));
}
async function insert<T>(table:string, values:object):Promise<T> {
  const rows=await api<T[]>(`/rest/v1/${table}?select=*`,{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(values)});
  if(rows.length!==1)throw new Error(`Insert ${table} did not return one row`);
  return rows[0];
}
async function patch(table:string,id:string,values:object,filters?:Record<string,string>):Promise<boolean> {
  const rows=await api<Array<{id:string}>>(query(table,{id:`eq.${id}`,select:'id',...filters}), {method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(values)});
  return rows.length===1;
}

export type Inquiry = { id: string; name: string; email: string; phone: string | null; service: string; event_date: string | null; location: string | null; budget: string | null; details: string | null; status: string; created_at: string };
export type Project = { id: string; inquiry_id: string | null; client_name: string; client_email: string; title: string; status: string; event_date: string | null; location: string | null; quote_amount_cents: number | null; quote_notes: string; portal_expires_at: string | null; created_at: string; updated_at: string };
export type PortfolioEntry = {id:string;title:string;category:string;summary:string;image_filename:string;image_mime:string;video_url:string|null;consent_confirmed:boolean;published:boolean;created_at:string};
export type Deliverable = { id: string; project_id: string; title: string; description: string; url: string | null; visible: boolean; created_at: string };
export const statuses = ['planning','quoted','contract','deposit-pending','scheduled','shooting','editing','client-review','delivered','archived'] as const;

export function hashToken(token: string) {return createHash('sha256').update(token).digest('hex');}
export function identifyIp(ip: string) {
  const salt = process.env.SESSION_SECRET;
  if (!salt || salt.length<32) throw new Error('SESSION_SECRET_NOT_CONFIGURED');
  return createHash('sha256').update(salt+':'+ip).digest('hex');
}

export async function listInquiries():Promise<Inquiry[]> {return getRows('pc_inquiries',{select:'id,name,email,phone,service,event_date,location,budget,details,status,created_at',order:'created_at.desc',limit:'200'});}
export async function listProjects():Promise<Project[]> {return getRows('pc_projects',{select:'id,inquiry_id,client_name,client_email,title,status,event_date,location,quote_amount_cents,quote_notes,portal_expires_at,created_at,updated_at',order:'updated_at.desc',limit:'200'});}
export async function getProject(id:string):Promise<Project|undefined>{const x=await getRows<Project>('pc_projects',{id:`eq.${id}`,select:'*',limit:'1'});return x[0];}
export async function listDeliverables(id:string,client=false):Promise<Deliverable[]> {return getRows('pc_deliverables',{project_id:`eq.${id}`,...(client?{visible:'eq.true'}:{}),select:'*',order:'created_at.desc'});}

export async function createInquiry(data: Omit<Inquiry,'id'|'status'|'created_at'>, ipHash:string){
  const since = new Date(Date.now()-3600000).toISOString();
  const recent = await getRows<{id:string}>('pc_inquiries',{select:'id',ip_hash:`eq.${ipHash}`,created_at:`gte.${since}`,limit:'5'});
  if (recent.length>=5)return {ok:false,reason:'rate_limit'} as const;
  const row=await insert<{id:string}>('pc_inquiries',{...data,ip_hash:ipHash});
  return {ok:true,id:row.id} as const;
}
export async function convertInquiry(id:string){
  const token=randomBytes(32).toString('base64url');
  const result=await api<Array<{project_id:string;created:boolean}>>('/rest/v1/rpc/pc_convert_inquiry', {method:'POST',body:JSON.stringify({p_inquiry_id:id,p_project_id:randomUUID(),p_token_hash:hashToken(token),p_expires_at:new Date(Date.now()+90*86400000).toISOString()})});
  if(!result.length)return null;
  return {projectId:result[0].project_id,token:result[0].created?token:null};
}
export async function getClientProject(token:string):Promise<Project|undefined>{
  if(!/^[A-Za-z0-9_-]{40,100}$/.test(token))return undefined;
  const x=await getRows<Project>('pc_projects',{portal_token_hash:`eq.${hashToken(token)}`,portal_expires_at:`gt.${new Date().toISOString()}`,select:'id,inquiry_id,client_name,client_email,title,status,event_date,location,quote_amount_cents,quote_notes,portal_expires_at,created_at,updated_at',limit:'1'});
  return x[0];
}
export async function regeneratePortalToken(id:string):Promise<string|null>{
  const token=randomBytes(32).toString('base64url');
  const updated=await patch('pc_projects',id,{portal_token_hash:hashToken(token),portal_expires_at:new Date(Date.now()+90*86400000).toISOString(),updated_at:new Date().toISOString()});
  return updated?token:null;
}
export async function updateProject(id:string,data:{status:string;amount:number|null;notes:string}):Promise<boolean>{
  if(!statuses.includes(data.status as typeof statuses[number]))return false;
  if(data.amount!==null&&(!Number.isSafeInteger(data.amount)||data.amount<0||data.amount>100000000))return false;
  return patch('pc_projects',id,{status:data.status,quote_amount_cents:data.amount,quote_notes:data.notes,updated_at:new Date().toISOString()});
}
export async function addDeliverable(projectId:string,title:string,description:string,url:string|null):Promise<boolean>{
  if(!await getProject(projectId))return false;
  await insert('pc_deliverables',{id:randomUUID(),project_id:projectId,title,description,url,visible:false});return true;
}
export async function toggleDeliverable(projectId:string,id:string,visible:boolean):Promise<boolean>{return patch('pc_deliverables',id,{visible},{project_id:`eq.${projectId}`});}
export async function adminLoginThrottled(ipHash:string):Promise<boolean>{
  const attempts=await getRows<{id:number}>('pc_admin_attempts',{select:'id',ip_hash:`eq.${ipHash}`,at:`gte.${new Date(Date.now()-15*60000).toISOString()}`,limit:'8'});
  return attempts.length>=8;
}
export async function recordAdminAttempt(ipHash:string):Promise<void>{
  await insert('pc_admin_attempts',{ip_hash:ipHash});
  // Old rows are not deleted in a public request; schedule retention cleanup separately.
}
export async function listPortfolio(publicOnly=false):Promise<PortfolioEntry[]>{return getRows('pc_portfolio_entries',{select:'*',...(publicOnly?{published:'eq.true'}:{}),order:'created_at.desc',limit:'100'});}
export async function getPortfolioEntry(id:string):Promise<PortfolioEntry|undefined>{const x=await getRows<PortfolioEntry>('pc_portfolio_entries',{select:'*',id:`eq.${id}`,limit:'1'});return x[0];}
export async function createPortfolioEntry(data:{title:string;category:string;summary:string;filename:string;mime:string;videoUrl:string|null;consent:boolean}):Promise<string>{
 const id=randomUUID();await insert('pc_portfolio_entries',{id,title:data.title,category:data.category,summary:data.summary,image_filename:data.filename,image_mime:data.mime,video_url:data.videoUrl,consent_confirmed:data.consent,published:false});return id;
}
export async function setPortfolioPublished(id:string,published:boolean):Promise<boolean>{return patch('pc_portfolio_entries',id,{published},published?{consent_confirmed:'eq.true'}:undefined);}

const BUCKET='primecuts-portfolio';
export async function uploadPortfolioImage(filename:string,bytes:Buffer,mime:string):Promise<void>{
 if(!storageConfigured())throw new Error('SUPABASE_NOT_CONFIGURED');
 const result=await fetch(`${baseUrl()}/storage/v1/object/${BUCKET}/${filename}`,{method:'POST',cache:'no-store',headers:serverHeaders({'Content-Type':mime,'x-upsert':'false'}),body:new Uint8Array(bytes)});
 if(!result.ok)throw new Error(`Storage upload ${result.status}: ${(await result.text()).slice(0,280)}`);
}
export async function deletePortfolioImage(filename:string):Promise<void>{
 if(!/^[a-f0-9-]{36}\.(jpg|png|webp)$/.test(filename))return;
 const result=await fetch(`${baseUrl()}/storage/v1/object/${BUCKET}`,{method:'DELETE',cache:'no-store',headers:serverHeaders({'Content-Type':'application/json'}),body:JSON.stringify({prefixes:[filename]})});
 if(!result.ok)console.error('Failed to clean orphaned portfolio image',result.status);
}
export async function readPortfolioImage(filename:string):Promise<ArrayBuffer>{
 if(!/^[a-f0-9-]{36}\.(jpg|png|webp)$/.test(filename))throw new Error('INVALID_MEDIA_PATH');
 const response=await fetch(`${baseUrl()}/storage/v1/object/authenticated/${BUCKET}/${filename}`,{headers:serverHeaders(),cache:'no-store'});
 if(!response.ok)throw new Error(`Storage download status ${response.status}`);
 return response.arrayBuffer();
}
