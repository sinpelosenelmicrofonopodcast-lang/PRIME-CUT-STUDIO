import {boundedForm} from '@/lib/form-request';
import {NextResponse} from 'next/server';
import {randomUUID} from 'node:crypto';
import {requestIsSameOrigin,sameOriginRedirect} from '@/lib/auth';
import {serverHeaders,storageConfigured} from '@/lib/db';
import {castingById,requireCapability,updateCastingPresentation,audit} from '@/lib/operations-db';
export const runtime='nodejs';
const uuid=/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;
const MAX=4*1024*1024;
function kind(bytes:Uint8Array){
 if(bytes.length>=4&&bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff)return {mime:'image/jpeg',ext:'jpg'};
 if(bytes.length>=8&&[137,80,78,71,13,10,26,10].every((n,i)=>bytes[i]===n))return {mime:'image/png',ext:'png'};
 if(bytes.length>=12&&String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP')return {mime:'image/webp',ext:'webp'};
 return null;
}
export async function POST(request:Request){
 if(!requestIsSameOrigin(request))return new Response('Origen inválido',{status:403});
 if(Number(request.headers.get('content-length')||0)>MAX+12000)return new Response('Imagen demasiado grande (máx. 4 MB)',{status:413});
 const data=await boundedForm(request,4206304);if(data instanceof Response)return data;
 const id=String(data.get('id')||''),file=data.get('image');
 if(!uuid.test(id)||!(file instanceof File))return new Response('Archivo inválido',{status:400});
 const call=await castingById(id);
 if(!call)return new Response('Casting no encontrado',{status:404});
 const actor=await requireCapability('casting.write',call.project_id);
 if(!actor)return new Response('No autorizado',{status:403});
 if(file.size<1000||file.size>MAX)return new Response('Imagen de hasta 4 MB requerida',{status:413});
 const bytes=new Uint8Array(await file.arrayBuffer()),format=kind(bytes);
 if(!format||format.mime!==file.type)return new Response('Solo imágenes JPG, PNG o WebP válidas',{status:415});
 if(!storageConfigured())return new Response('Almacenamiento no configurado',{status:503});
 const base=process.env.SUPABASE_URL!;
 const bucket='primecuts-casting-public';
 const key=`casting/${id}/${randomUUID()}.${format.ext}`;
 const endpoint=`${base}/storage/v1/object/${bucket}/${key}`;
 try{
  const res=await fetch(endpoint,{method:'POST',headers:serverHeaders({'Content-Type':format.mime,'Cache-Control':'3600','x-upsert':'false'}),body:bytes,cache:'no-store'});
  if(!res.ok){console.error('Casting cover upload rejected',res.status);return new Response('No se pudo cargar la portada',{status:502});}
  const url=`${base}/storage/v1/object/public/${bucket}/${key}`;
  const saved=await updateCastingPresentation(id,{...(call.presentation||{}),image:url});
  if(saved!==1)return new Response('Imagen subida, pero no pudo asociarse al casting',{status:503});
  await audit('casting.cover.upload','casting_call',id,actor,call.project_id,{storagePath:key,size:file.size});
  return NextResponse.redirect(sameOriginRedirect(request,'/team/casting/'+id+'/edit?uploaded=1'),303);
 }catch(e){console.error('Casting cover upload failed',e);return new Response('Error al procesar la portada',{status:503});}
}
