import {readFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {getPortfolioEntry} from '@/lib/db';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;if(!/^[\da-f-]{36}$/i.test(id))return new Response('Not found',{status:404});
 const entry=getPortfolioEntry(id);if(!entry||!entry.published)return new Response('Not found',{status:404});
 if(!/^[\da-f-]{36}\.(jpg|png|webp)$/i.test(entry.image_filename))return new Response('Not found',{status:404});
 const path=join(resolve(process.env.PRIMECUTS_MEDIA_PATH||join(process.cwd(),'data','portfolio')),entry.image_filename);
 try{const bytes=await readFile(path);return new Response(new Uint8Array(bytes),{headers:{'Content-Type':entry.image_mime,'Cache-Control':'public, max-age=3600','X-Content-Type-Options':'nosniff'}});}catch{return new Response('Not found',{status:404});}
}
