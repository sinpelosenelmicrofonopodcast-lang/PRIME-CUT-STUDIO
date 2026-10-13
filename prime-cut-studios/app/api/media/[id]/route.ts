import {getPortfolioEntry,readPortfolioImage} from '@/lib/db';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 if(!/^[\da-f-]{36}$/i.test(id))return new Response('Not found',{status:404});
 const entry=await getPortfolioEntry(id);
 if(!entry||!entry.published||!entry.consent_confirmed)return new Response('Not found',{status:404});
 try{
  const bytes=await readPortfolioImage(entry.image_filename);
  return new Response(bytes,{headers:{'Content-Type':entry.image_mime,'Cache-Control':'public,max-age=3600','X-Content-Type-Options':'nosniff'}});
 }catch{return new Response('Not found',{status:404});}
}
