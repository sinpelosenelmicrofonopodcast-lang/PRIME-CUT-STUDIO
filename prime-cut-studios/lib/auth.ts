import {createHmac, scryptSync, timingSafeEqual} from 'node:crypto';
import {cookies} from 'next/headers';
const COOKIE='primecuts_admin_session';
const MAX_AGE=60*60*8;
const secret=()=>process.env.SESSION_SECRET;
export function isAdminConfigured() {return Boolean(secret() && secret()!.length>=32 && process.env.ADMIN_PASSWORD_HASH && process.env.ADMIN_EMAIL);}
export function verifyPassword(password:string){
  try {
    const [method,salt,expected]= (process.env.ADMIN_PASSWORD_HASH||'').split('$');
    if(method!=='scrypt'||!salt||!expected) return false;
    const target=Buffer.from(expected,'base64url');const computed=scryptSync(password,Buffer.from(salt,'base64url'),target.length);
    return target.length===computed.length && timingSafeEqual(target,computed);
  } catch{return false;}
}
function sign(value:string){return createHmac('sha256',secret()!).update(value).digest('base64url');}
export function createSession(){
  if(!isAdminConfigured()) throw new Error('ADMIN_NOT_CONFIGURED');
  const payload=Buffer.from(JSON.stringify({role:'admin',exp:Date.now()+MAX_AGE*1000})).toString('base64url');
  return payload+'.'+sign(payload);
}
export async function adminAuthenticated(){
  if(!isAdminConfigured()) return false;
  const token=(await cookies()).get(COOKIE)?.value;
  if(!token) return false;
  const [payload,sig]=token.split('.');
  if(!payload||!sig) return false;
  const actual=Buffer.from(sig,'utf8'),expected=Buffer.from(sign(payload),'utf8');
  if(actual.length!==expected.length||!timingSafeEqual(actual,expected))return false;
  try{const obj=JSON.parse(Buffer.from(payload,'base64url').toString('utf8'));return obj.role==='admin'&&typeof obj.exp==='number'&&obj.exp>Date.now();}catch{return false;}
}
export async function setAdminSession(value:string){(await cookies()).set(COOKIE,value,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:MAX_AGE});}
export async function clearAdminSession(){(await cookies()).delete(COOKIE);}
export function requestIsSameOrigin(request:Request){
  const origin=request.headers.get('origin');if(!origin) return false;
  try{return new URL(origin).host===new URL(request.url).host;}catch{return false;}
}
export function safeIp(request:Request){return request.headers.get('x-real-ip')||request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';}
