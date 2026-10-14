import sharp from 'sharp';
import {randomUUID} from 'node:crypto';
import {serverHeaders,storageConfigured} from '@/lib/db';
export const castingPhotoBucket='primecuts-casting-private';
export const castingPhotoPath=/^[a-f0-9-]{36}\/[a-f0-9-]{36}\.jpg$/;
export async function prepareCastingPhoto(file:File){
 if(file.size===0||file.size>1024*1024)throw new Error('Cada foto debe ocupar como máximo 1 MB. Selecciónala de nuevo para optimizarla.');
 const bytes=Buffer.from(await file.arrayBuffer());
 const jpeg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
 const png=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
 const webp=bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP';
 if(!jpeg&&!png&&!webp)throw new Error('Selecciona una foto JPG, PNG o WebP válida.');
 const result=await sharp(bytes,{limitInputPixels:32000000,failOn:'error'}).rotate().resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true}).flatten({background:'#ffffff'}).jpeg({quality:84}).toBuffer();
 if(result.length>1024*1024)throw new Error('La foto es demasiado grande. Usa una imagen de menor tamaño.');
 return result;
}
export async function uploadCastingPhotos(images:Buffer[]){
 if(!storageConfigured())throw new Error('El almacenamiento no está disponible. Intenta más tarde.');
 const folder=randomUUID(),paths:string[]=[];
 try{for(const bytes of images){const path=folder+'/'+randomUUID()+'.jpg';const r=await fetch(`${process.env.SUPABASE_URL}/storage/v1/object/${castingPhotoBucket}/${path}`,{method:'POST',headers:serverHeaders({'Content-Type':'image/jpeg','x-upsert':'false'}),body:new Uint8Array(bytes),cache:'no-store'});if(!r.ok)throw new Error('No se pudo guardar la foto. Intenta nuevamente.');paths.push(path);}return paths;}
 catch(e){await deleteCastingPhotos(paths);throw e;}
}
export async function deleteCastingPhotos(paths:string[]){if(paths.length)await fetch(`${process.env.SUPABASE_URL}/storage/v1/object/${castingPhotoBucket}`,{method:'DELETE',headers:serverHeaders({'Content-Type':'application/json'}),body:JSON.stringify({prefixes:paths}),cache:'no-store'});}
export async function readCastingPhoto(path:string){if(!castingPhotoPath.test(path))throw new Error('Invalid path');const r=await fetch(`${process.env.SUPABASE_URL}/storage/v1/object/authenticated/${castingPhotoBucket}/${path}`,{headers:serverHeaders(),cache:'no-store'});if(!r.ok)throw new Error('Photo unavailable');return new Uint8Array(await r.arrayBuffer());}
