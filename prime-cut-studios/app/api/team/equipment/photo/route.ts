import {randomUUID} from 'node:crypto';
import {boundedForm} from '@/lib/form-request';
import {requestIsSameOrigin} from '@/lib/auth';
import {serverHeaders,storageConfigured} from '@/lib/db';
import {equipmentById} from '@/lib/equipment-catalog';
import {requireCapability,equipmentOverrides,setEquipmentPhoto,audit} from '@/lib/operations-db';
export const runtime='nodejs';
const MAX=4*1024*1024;
function imageType(b:Uint8Array){
  if(b.length>=8&&[137,80,78,71,13,10,26,10].every((n,i)=>b[i]===n))return {mime:'image/png',ext:'png'};
  if(b.length>=3&&b[0]===255&&b[1]===216&&b[2]===255)return {mime:'image/jpeg',ext:'jpg'};
  if(b.length>=12&&String.fromCharCode(...b.slice(0,4))==='RIFF'&&String.fromCharCode(...b.slice(8,12))==='WEBP')return {mime:'image/webp',ext:'webp'};
  return null;
}
export async function POST(req:Request){
  if(!requestIsSameOrigin(req))return new Response('Forbidden',{status:403});
  const actor=await requireCapability('inventory.write');
  if(!actor)return new Response('Forbidden',{status:403});
  const form=await boundedForm(req,MAX+12000);if(form instanceof Response)return form;
  const assetId=String(form.get('assetId')||''),file=form.get('image');
  if(!equipmentById(assetId))return new Response('Unknown equipment',{status:404});
  if(!(file instanceof File)||!file.size||file.size>MAX)return new Response('Choose an image up to 4 MB',{status:400});
  if(form.get('rights')!=='yes')return new Response('Confirm permission to publish this product photograph',{status:400});
  const bytes=new Uint8Array(await file.arrayBuffer()),type=imageType(bytes);
  if(!type||type.mime!==file.type)return new Response('Only valid PNG, JPG and WebP images are accepted',{status:415});
  if(!storageConfigured())return new Response('Storage unavailable',{status:503});
  const key=`equipment/${assetId}/${randomUUID()}.${type.ext}`,bucket='primecuts-casting-public';
  const endpoint=`${process.env.SUPABASE_URL}/storage/v1/object/${bucket}/${key}`;
  const uploaded=await fetch(endpoint,{method:'POST',headers:serverHeaders({'Content-Type':type.mime,'x-upsert':'false'}),body:bytes,cache:'no-store'});
  if(!uploaded.ok)return new Response('Could not store photograph',{status:502});
  const url=`${process.env.SUPABASE_URL}/storage/v1/object/public/${bucket}/${key}`;
  try{
    await setEquipmentPhoto(assetId,url);
  }catch{
    // A transport error may occur after persistence; read back before deleting an orphan.
    try{const saved=(await equipmentOverrides()).find(o=>o.asset_id===assetId);
      if(saved?.photo_url!==url){await fetch(endpoint,{method:'DELETE',headers:serverHeaders(),cache:'no-store'});return new Response('Could not associate photograph. Try again.',{status:503});}
    }catch{return new Response('Upload status unknown. Refresh equipment before retrying.',{status:503});}
  }
  await audit('equipment.photo.upload','equipment',assetId,actor,null,{storagePath:key,size:file.size});
  return Response.json({ok:true});
}
