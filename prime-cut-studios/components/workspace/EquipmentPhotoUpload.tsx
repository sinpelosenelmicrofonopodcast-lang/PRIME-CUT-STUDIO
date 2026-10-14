'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
export function EquipmentPhotoUpload({assetId}:{assetId:string}){
  const [busy,setBusy]=useState(false),[error,setError]=useState('');const router=useRouter();
  return <form className="form" method="post" action="/api/team/equipment/photo" encType="multipart/form-data" onSubmit={async e=>{
    e.preventDefault();if(busy)return;const form=e.currentTarget;setBusy(true);setError('');
    try{const r=await fetch(form.action,{method:'POST',body:new FormData(form),credentials:'same-origin'});
      if(!r.ok){setError((await r.text()).slice(0,200));return;}
      form.reset();router.refresh();
    }catch{setError('Connection interrupted. Refresh equipment before retrying.');}finally{setBusy(false);}
  }}><input type="hidden" name="assetId" value={assetId}/><label>Product photograph · max. 4 MB<input type="file" name="image" accept="image/png,image/jpeg,image/webp" required disabled={busy}/></label>
    <label><input type="checkbox" name="rights" value="yes" required disabled={busy}/> I own or have permission to publish this exact product photograph.</label>
    <button className="btn secondary" disabled={busy}>{busy?'Uploading…':'Upload photograph'}</button>{error&&<p className="note" role="alert">{error}</p>}
  </form>;
}
