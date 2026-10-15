'use client';
import {castingPhotoForUpload} from '@/components/workspace/CastingPhotoPicker';
import {useState,type ComponentProps} from 'react';import {useRouter} from 'next/navigation';
/** Retains user input on validation, stale revision, network and permission errors. */
export function WorkspaceForm({children,onSubmit,...props}:ComponentProps<'form'>){
 const [error,setError]=useState(''),[busy,setBusy]=useState(false);const router=useRouter();
 return <form {...props} aria-busy={busy} onSubmit={async event=>{
 event.preventDefault();if(busy)return;const form=event.currentTarget;
 // Inputs named action shadow HTMLFormElement.action. Read the attribute itself.
 const actionUrl=new URL(form.getAttribute('action')||window.location.href,window.location.href).href;
 const submitter=(event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement|null;
 const raw=new FormData(form);
 if(submitter?.name)raw.append(submitter.name,submitter.value);
 setBusy(true);setError('');
 try{let data:FormData|URLSearchParams;
 if(form.enctype==='multipart/form-data'){data=raw;const photos=raw.getAll('photos').filter((f):f is File=>f instanceof File&&f.size>0);if(photos.length>3)throw new Error('Selecciona hasta 3 fotos.');raw.delete('photos');for(const photo of photos)raw.append('photos',await castingPhotoForUpload(photo));}
 else{data=new URLSearchParams();for(const [name,value] of raw)if(typeof value==='string')data.append(name,value);}
 const response=await fetch(actionUrl,{method:'POST',body:data,credentials:'same-origin',headers:{Accept:'application/json'}});
 if(!response.ok){const message=await response.text();setError(response.status===409?(message.length<200?message:'The information changed, the selected talent is unavailable, or this action was already submitted. Reload before trying again. Your entries remain below.'):response.status===403||response.status===401?'Access expired or this action is not permitted. Sign in and try again.':response.status===503?'This update is not active yet. Contact the studio.':message.length<200?message:`Could not save (HTTP ${response.status}). Your entries have been kept.`);return;}
 // A completed POST must not be reported as failed because the redirected GET
 // could not render. The targeted routes return a short JSON success response.
 let destination=response.url;
 if(response.headers.get('content-type')?.includes('application/json')){
  const result=await response.json() as {ok?:boolean;redirect?:string};
  if(result.ok!==true||typeof result.redirect!=='string'||!result.redirect.startsWith('/')||result.redirect.startsWith('//'))throw new Error('The server did not confirm the save. Your entries have been kept.');
  destination=new URL(result.redirect,actionUrl).toString();
 }
 const target=new URL(destination);if(target.origin!==new URL(actionUrl).origin)throw new Error('Unexpected response destination. Your entries have been kept.');
 router.push(target.pathname+target.search+target.hash);router.refresh();
 }catch(e){setError(e instanceof Error&&!(e instanceof TypeError)?e.message:'Connection interrupted. Your entries have been kept. Please try again.');}finally{setBusy(false);}
 }}>
 {children}<p role="status" className="small muted" aria-live="polite">{busy?'Saving…':''}</p>{error&&<p role="alert" className="note">{error}</p>}
 </form>;
}
