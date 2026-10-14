/** Server-only gear reservation read/write. Requires operations auth in each calling route. */
import {serverHeaders} from '@/lib/db';
const root=()=>process.env.SUPABASE_URL+'/rest/v1/';
export type GearBooking={id:string;asset_id:string;project_id:string|null;requester_name:string;start_date:string;end_date:string;status:'hold'|'confirmed'|'cancelled'|'returned';hold_expires_at:string;created_at:string};
async function call<T>(path:string,init:RequestInit={}):Promise<T>{
 const res=await fetch(root()+path,{...init,cache:'no-store',headers:serverHeaders({'Content-Type':'application/json',...(init.headers as Record<string,string>||{})})});
 if(!res.ok)throw new Error('Booking operation failed '+res.status);if(res.status===204)return null as T;return res.json() as Promise<T>;
}
export async function equipmentBookings(){return call<GearBooking[]>('pc_equipment_bookings?select=id,asset_id,project_id,requester_name,start_date,end_date,status,hold_expires_at,created_at&order=start_date.desc&limit=250')}
export async function gearBooking(id:string){const r=await call<GearBooking[]>('pc_equipment_bookings?id=eq.'+encodeURIComponent(id)+'&select=*&limit=1');return r[0]||null}
export async function reserveGear(asset:string,requester:string,start:string,end:string,project:string|null){
 const res=await call<Array<{booking_id:string|null;booked:boolean}>>('rpc/pc_reserve_equipment',{method:'POST',body:JSON.stringify({p_asset_id:asset,p_requester:requester,p_start:start,p_end:end,p_project_id:project})});
 return res[0]||{booked:false,booking_id:null};
}
export async function confirmGear(id:string){const yes=await call<boolean>('rpc/pc_confirm_equipment_booking',{method:'POST',body:JSON.stringify({p_id:id})});return yes===true}
export async function closeGear(id:string,status:'cancelled'|'returned'){
 const rows=await call<Array<{id:string}>>('pc_equipment_bookings?id=eq.'+encodeURIComponent(id)+'&select=id',{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({status,...(status==='returned'?{checked_in_at:new Date().toISOString()}:{})})});
 return rows.length===1;
}
