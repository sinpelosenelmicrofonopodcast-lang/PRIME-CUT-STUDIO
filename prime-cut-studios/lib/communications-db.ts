import {restResponse} from '@/lib/rest-response';
import 'server-only';
import {serverHeaders} from '@/lib/db';
export async function comm<T>(path:string,init:RequestInit={}):Promise<T>{const r=await fetch(`${process.env.SUPABASE_URL}/rest/v1/${path}`,{...init,cache:'no-store',headers:serverHeaders({'Content-Type':'application/json',...(init.headers as Record<string,string>||{})})});if(!r.ok)throw new Error('COMMUNICATIONS_DATABASE_'+r.status);return restResponse<T>(r);}
export function filters(table:string,values:Record<string,string>){return table+'?'+new URLSearchParams(values);}
export async function rpc<T>(name:string,body:object){return comm<T>('rpc/'+name,{method:'POST',body:JSON.stringify(body)});}
export async function allowAction(key:string,limit=3,seconds=900){return rpc<boolean>('pc_rate_limit',{p_key:key,p_limit:limit,p_seconds:seconds});}
export const commEnabled=()=>process.env.PRIMECUTS_COMMUNICATIONS_V3==='true';
