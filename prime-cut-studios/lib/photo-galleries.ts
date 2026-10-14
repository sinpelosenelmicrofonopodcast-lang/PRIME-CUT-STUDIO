/** Lightroom photo galleries. SERVER ONLY: each client read must follow membership check.
 * Never paste private album URLs into source control or public portfolio without consent.
 */
import {randomUUID} from 'node:crypto';
import {serverHeaders} from '@/lib/db';
import {unstable_cache} from 'next/cache';
export type GalleryVisibility='draft'|'client'|'public';
export type GalleryType='proofs'|'final_delivery'|'portfolio';
export const galleryCategories=['Photography','Events','Commercial','Portraits','Music Video','Other'] as const;
export type PhotoGallery={id:string;project_id:string|null;title:string;description:string;category:string;gallery_type:GalleryType;album_url:string;embed_url:string|null;visibility:GalleryVisibility;consent_confirmed:boolean;requested_downloads:boolean;created_at:string;updated_at:string};
const host=()=>process.env.SUPABASE_URL+'/rest/v1/';
function headers(extra:Record<string,string>={}){return serverHeaders({'Content-Type':'application/json',...extra});}
async function call<T>(path:string,options:RequestInit={}):Promise<T>{
 const r=await fetch(host()+path,{...options,cache:'no-store',headers:headers(options.headers as Record<string,string>||{})});
 if(!r.ok)throw new Error('Photo gallery database error '+r.status);
 return r.status===204?null as T:r.json() as Promise<T>;
}
const query=(arg:Record<string,string>)=>new URLSearchParams(arg).toString();
const select='id,project_id,title,description,category,gallery_type,album_url,embed_url,visibility,consent_confirmed,requested_downloads,created_at,updated_at';
export function validatedLightroomAlbumUrl(value:string):string|null{
 try{const u=new URL(value.trim());if(u.protocol!=='https:'||u.username||u.password||u.port||u.href.length>1000)return null;
 if(!['adobe.ly','lightroom.adobe.com'].includes(u.hostname.toLowerCase()))return null;
 // Never allow arbitrary scripts, embeds or HTML in gallery source.
 return u.toString();
 }catch{return null;}
}
/** Accept URL or copy-embed-code from Lightroom, extracting ONLY its src attribute. */
export function validatedLightroomEmbedUrl(value:string):string|null{
 if(!value.trim())return null;
 const raw=value.includes('<iframe')?value.match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1]||'':value;
 try{const u=new URL(raw.trim().replaceAll('&amp;','&'));if(u.protocol!=='https:'||u.hostname.toLowerCase()!=='lightroom.adobe.com'||u.username||u.password||u.port||u.href.length>1000)return null;return u.toString();}catch{return null;}
}
export async function allPhotoGalleries(){return call<PhotoGallery[]>('pc_photo_galleries?'+query({select,order:'created_at.desc',limit:'150'}));}
export async function clientPhotoGalleries(projectId:string){
 return call<PhotoGallery[]>('pc_photo_galleries?'+query({project_id:'eq.'+projectId,visibility:'eq.client',select,order:'created_at.desc'}));
}
export async function publicPhotoGalleries(){
 return call<PhotoGallery[]>('pc_photo_galleries?'+query({visibility:'eq.public',consent_confirmed:'eq.true',select,order:'created_at.desc',limit:'60'}));
}
export async function photoGalleryById(id:string){
 const result=await call<PhotoGallery[]>('pc_photo_galleries?'+query({id:'eq.'+id,select,limit:'1'}));return result[0]||null;
}
export async function createPhotoGallery(data:Omit<PhotoGallery,'id'|'created_at'|'updated_at'>){
 const rows=await call<PhotoGallery[]>('pc_photo_galleries?select=*',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({...data,id:randomUUID()})});
 return rows[0]||null;
}
export async function setPhotoGalleryVisibility(id:string,visibility:GalleryVisibility,consent:boolean){
 const result=await call<Array<{id:string}>>('pc_photo_galleries?'+query({id:'eq.'+id,select:'id'}),{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({visibility,consent_confirmed:consent,updated_at:new Date().toISOString()})});
 return result.length===1;
}

/** Cache only the official iframe URL. Adobe serves every photo, not our servers.
 * One small metadata lookup per hour at most; no scheduled sync and no photo copies.
 */
export const featuredPublicLightroomEmbed=unstable_cache(async(albumUrl:string):Promise<string|null>=>{
 try{
  const matches=await call<Array<{embed_url:string|null}>>('pc_photo_galleries?'+query({
   album_url:'eq.'+albumUrl,visibility:'eq.public',consent_confirmed:'eq.true',select:'embed_url',limit:'1'
  }));
  const url=matches[0]?.embed_url||'';
  return validatedLightroomEmbedUrl(url);
 }catch{return null;}
},['primecuts-featured-lightroom-embed'],{revalidate:3600,tags:['primecuts-featured-lightroom-embed']});

/** Save the official embed for the single public showcase, using the existing
 * private owner-only gallery table. Auth + consent are enforced by the route.
 */
export async function registerFeaturedPublicAlbum(input:{albumUrl:string;embedUrl:string;title:string;description:string}){
 const url=validatedLightroomAlbumUrl(input.albumUrl);
 const embed=validatedLightroomEmbedUrl(input.embedUrl);
 if(!url||!embed)throw new Error('INVALID_LIGHTROOM_LINK');
 const existing=await call<Array<{id:string}>>('pc_photo_galleries?'+query({album_url:'eq.'+url,gallery_type:'eq.portfolio',project_id:'is.null',select:'id',limit:'1'}));
 if(existing.length){
  const changed=await call<Array<{id:string}>>('pc_photo_galleries?'+query({id:'eq.'+existing[0].id,select:'id'}),{
   method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({
    embed_url:embed,gallery_type:'portfolio',visibility:'public',consent_confirmed:true,
    updated_at:new Date().toISOString()
   })
  });
  if(changed.length!==1)throw new Error('COULD_NOT_UPDATE_SHOWCASE');
  return changed[0].id;
 }
 const saved=await createPhotoGallery({
  project_id:null,title:input.title,description:input.description,category:'Photography',
  gallery_type:'portfolio',album_url:url,embed_url:embed,
  visibility:'public',consent_confirmed:true,requested_downloads:false
 });
 if(!saved)throw new Error('COULD_NOT_SAVE_SHOWCASE');
 return saved.id;
}
