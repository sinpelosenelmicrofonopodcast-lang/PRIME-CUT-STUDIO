import {publicSiteOrigin} from '@/lib/site-origin';
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
  if(!token||token.length>600) return false;
  const [payload,sig,...extra]=token.split('.');
  if(!payload||!sig||extra.length) return false;
  const actual=Buffer.from(sig,'utf8'),expected=Buffer.from(sign(payload),'utf8');
  if(actual.length!==expected.length||!timingSafeEqual(actual,expected))return false;
  try{const obj=JSON.parse(Buffer.from(payload,'base64url').toString('utf8'));return obj.role==='admin'&&typeof obj.exp==='number'&&obj.exp>Date.now();}catch{return false;}
}
export async function setAdminSession(value:string){(await cookies()).set(COOKIE,value,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:MAX_AGE});}
export async function clearAdminSession(){(await cookies()).delete(COOKIE);}
const PRIMARY_SITE='prime-cut-studios.vercel.app';
const PUBLIC_SITE_HOSTS=new Set(['prime-cut-studios.vercel.app','primecutstudiostx.com','www.primecutstudiostx.com']);
const TRUSTED_PROJECT_HOST=/^prime-cut-studios(?:-[a-z0-9-]+)?\.vercel\.app$/i;
function requestHosts(request:Request){
  const hosts=[request.headers.get('host'),request.headers.get('x-forwarded-host'),new URL(request.url).host];
  return hosts.filter((host):host is string=>Boolean(host))
    .map(host=>host.trim().split(',')[0].toLowerCase());
}
export function requestIsSameOrigin(request:Request){
  // Vercel may put the deployment hostname in request.url although Safari's
  // Origin is the canonical public hostname. A strict request.url comparison
  // incorrectly rejects legitimate POST forms in that situation.
  const fetchSite=request.headers.get('sec-fetch-site');
  if(fetchSite&&fetchSite!=='same-origin'&&fetchSite!=='none')return false;
  const rawOrigin=request.headers.get('origin');
  if(rawOrigin&&rawOrigin!=='null'){
    try{
      const origin=new URL(rawOrigin);
      if(origin.pathname!=='/'||origin.search||origin.hash||origin.username||origin.password)return false;
      if(origin.protocol!=='https:'&&origin.hostname!=='localhost'&&origin.hostname!=='127.0.0.1')return false;
      const hosts=requestHosts(request);
      if(hosts.includes(origin.host.toLowerCase()))return true;
      // Canonical production site forwarded through a project-specific Vercel
      // deployment hostname. Never accept a foreign Origin here.
      return PUBLIC_SITE_HOSTS.has(origin.host.toLowerCase())&&hosts.some(h=>TRUSTED_PROJECT_HOST.test(h));
    }catch{return false;}
  }
  // Some browsers omit Origin for a top-level same-origin form submission.
  // Accept only browser-asserted same-origin; never accept a missing Origin
  // based solely on an untrusted Host or an absent fetch-metadata header.
  return fetchSite==='same-origin';
}
export function sameOriginRedirect(request:Request,path:string){
  const rawOrigin=request.headers.get('origin');
  if(rawOrigin&&rawOrigin!=='null'&&requestIsSameOrigin(request)){
    try{return new URL(path,new URL(rawOrigin));}catch{}
  }
  const host=request.headers.get('host')?.trim().toLowerCase();
  if(host&&/^localhost(?::\d+)?$/.test(host))return new URL(path,'http://'+host);
  // With no Origin (Safari edge case), use the known canonical site rather
  // than an internal Vercel deployment URL whose cookies are not shared.
  if(host&&PUBLIC_SITE_HOSTS.has(host))return new URL(path,'https://'+host);
  return new URL(path,publicSiteOrigin());
}
export function safeIp(request:Request){return request.headers.get('x-real-ip')||request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';}
