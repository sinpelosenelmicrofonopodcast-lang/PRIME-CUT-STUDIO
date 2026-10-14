import {serverHeaders} from '@/lib/db';
export async function adminDisableStaff(accountId:string,active:boolean){
 const url=process.env.SUPABASE_URL+'/rest/v1/pc_staff_members?account_id=eq.'+encodeURIComponent(accountId);
 const result=await fetch(url,{method:'PATCH',headers:serverHeaders({'Content-Type':'application/json'}),cache:'no-store',body:JSON.stringify({active})});
 if(!result.ok)throw new Error('Failed to update staff access');
 if(!active){
  const sessionUrl=process.env.SUPABASE_URL+'/rest/v1/pc_client_accounts?id=eq.'+encodeURIComponent(accountId);
  const read=await fetch(sessionUrl+'&select=session_version',{headers:serverHeaders(),cache:'no-store'});
  if(read.ok){const rows=await read.json();if(rows[0]?.session_version){await fetch(sessionUrl,{method:'PATCH',headers:serverHeaders({'Content-Type':'application/json'}),cache:'no-store',body:JSON.stringify({session_version:rows[0].session_version+1})});}}
 }
}
export async function staffMemberForAccount(accountId:string){
 const url=process.env.SUPABASE_URL+'/rest/v1/pc_staff_members?account_id=eq.'+encodeURIComponent(accountId)+'&active=eq.true&select=account_id,role&limit=1';
 try{const result=await fetch(url,{headers:serverHeaders(),cache:'no-store'});if(!result.ok)return null;const rows=await result.json();return rows[0]||null;}catch{return null;}
}
