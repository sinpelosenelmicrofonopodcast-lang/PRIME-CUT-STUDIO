import {createHmac,randomBytes,scryptSync,timingSafeEqual} from 'node:crypto';
import {verifiedAuthUser} from '@/lib/supabase-auth';
import {cookies} from 'next/headers';
import {clientAccountById,type ClientAccount} from '@/lib/db';

const COOKIE='primecuts_client_session';
const TTL=60*60*24*7;
const secret=()=>process.env.SESSION_SECRET||'';
function signature(payload:string){return createHmac('sha256',secret()).update(payload).digest('base64url');}
export function strongClientPassword(s:string){return s.length>=12&&s.length<=128;}
export function hashClientPassword(password:string){
  if(!strongClientPassword(password))throw new Error('WEAK_PASSWORD');
  const salt=randomBytes(24);return `scrypt$${salt.toString('base64url')}$${scryptSync(password,salt,64).toString('base64url')}`;
}
export function verifyClientPassword(password:string,hash:string){
  try{
    const [method,salt,expected]=hash.split('$');if(method!=='scrypt'||!salt||!expected)return false;
    const target=Buffer.from(expected,'base64url');if(target.length!==64)return false;
    return timingSafeEqual(scryptSync(password,Buffer.from(salt,'base64url'),64),target);
  }catch{return false;}
}
export async function setClientSession(account:Pick<ClientAccount,'id'|'session_version'>){
  if(secret().length<32)throw new Error('SESSION_SECRET_NOT_CONFIGURED');
  const payload=Buffer.from(JSON.stringify({id:account.id,v:account.session_version,exp:Date.now()+TTL*1000})).toString('base64url');
  (await cookies()).set(COOKIE,`${payload}.${signature(payload)}`,{
    httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:TTL
  });
}
export async function clientAuthenticated():Promise<ClientAccount|null>{
  if(secret().length<32)return null;
  const token=(await cookies()).get(COOKIE)?.value;
  if(!token||token.length>600)return null;
  const [payload,sig,...extra]=token.split('.');
  if(!payload||!sig||extra.length)return null;
  const actual=Buffer.from(sig),expected=Buffer.from(signature(payload));
  if(actual.length!==expected.length||!timingSafeEqual(actual,expected))return null;
  try{
    const data=JSON.parse(Buffer.from(payload,'base64url').toString('utf8'));
    if(!/^[a-f\d-]{36}$/i.test(data.id)||!Number.isSafeInteger(data.v)||typeof data.exp!=='number'||data.exp<=Date.now())return null;
    const account=await clientAccountById(data.id);
    if(!account||account.disabled||account.session_version!==data.v)return null;
    if(account.auth_user_id){const user=await verifiedAuthUser();if(!user||user.id!==account.auth_user_id)return null;}
    return account;
  }catch{return null;}
}
export async function clearClientSession(){(await cookies()).delete(COOKIE);}
