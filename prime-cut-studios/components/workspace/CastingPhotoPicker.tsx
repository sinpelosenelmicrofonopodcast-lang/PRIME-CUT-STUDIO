'use client';
import {useEffect,useState} from 'react';
export function CastingPhotoPicker(){
 const [files,setFiles]=useState<File[]>([]),[previews,setPreviews]=useState<string[]>([]),[error,setError]=useState('');
 useEffect(()=>{const urls=files.map(f=>URL.createObjectURL(f));setPreviews(urls);return ()=>urls.forEach(u=>URL.revokeObjectURL(u));},[files]);
 return <div className="casting-photo-picker"><label htmlFor="casting-photos">Subir fotos desde tu dispositivo</label><input id="casting-photos" type="file" name="photos" accept="image/jpeg,image/png,image/webp" multiple onChange={e=>{const selected=Array.from(e.currentTarget.files||[]);if(selected.length>3||selected.some(f=>f.size>30*1024*1024)){setError('Elige hasta 3 fotos, de máximo 30 MB cada una.');e.currentTarget.value='';setFiles([]);return;}setError('');setFiles(selected);}}/><small>Hasta 3 fotos JPG, PNG o WebP. Las optimizamos al enviar. Puedes subirlas directamente, usar un enlace o combinar ambas opciones.</small>{error&&<p role="alert">{error}</p>}<div className="casting-photo-previews">{previews.map((src,i)=><figure key={src}><img src={src} alt={'Vista previa de la foto '+(i+1)}/><figcaption>Foto {i+1}</figcaption></figure>)}</div></div>;
}
/** Optimize in the browser before the platform's request-size limit. */
export async function castingPhotoForUpload(file:File){
 if(!file.size)return file;
 if(file.size>30*1024*1024)throw new Error('Elige una foto de menos de 30 MB.');
 const url=URL.createObjectURL(file);try{
  const image=new Image();image.src=url;await image.decode();
  const scale=Math.min(1,1400/Math.max(image.naturalWidth,image.naturalHeight));
  const canvas=document.createElement('canvas');canvas.width=Math.round(image.naturalWidth*scale);canvas.height=Math.round(image.naturalHeight*scale);
  const context=canvas.getContext('2d');if(!context)throw new Error('No se pudo preparar la foto.');context.fillStyle='#ffffff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0,canvas.width,canvas.height);
  for(const quality of [.84,.7,.55]){const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/jpeg',quality));if(blob&&blob.size<=1024*1024)return new File([blob],'casting-photo.jpg',{type:'image/jpeg'});}
  throw new Error('La foto es demasiado grande. Selecciona una versión más pequeña.');
 }catch(e){throw new Error(e instanceof Error&&e.message.startsWith('La foto')?e.message:'No se pudo leer la foto. Usa JPG, PNG o WebP.');}finally{URL.revokeObjectURL(url);}
}
