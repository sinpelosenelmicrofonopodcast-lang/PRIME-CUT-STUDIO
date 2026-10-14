import 'server-only';
import {createCipheriv,createDecipheriv,createHash,randomBytes} from 'node:crypto';
function key(){const s=process.env.SESSION_SECRET||'';if(s.length<32)throw new Error('SESSION_SECRET_NOT_CONFIGURED');return createHash('sha256').update('primecuts-private-v3:'+s).digest();}
export function seal(value:object){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key(),iv);const data=Buffer.concat([cipher.update(JSON.stringify(value),'utf8'),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),data]).toString('base64url');}
export function unseal<T>(token:string):T|null{try{if(token.length>16000)return null;const bytes=Buffer.from(token,'base64url'),cipher=createDecipheriv('aes-256-gcm',key(),bytes.subarray(0,12));cipher.setAuthTag(bytes.subarray(12,28));return JSON.parse(Buffer.concat([cipher.update(bytes.subarray(28)),cipher.final()]).toString('utf8'));}catch{return null;}}
