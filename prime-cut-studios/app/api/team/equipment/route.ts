import {sameOriginRedirect as safeFormRedirect} from '@/lib/auth';
import {boundedForm} from '@/lib/form-request';
import {NextResponse} from 'next/server';import {requestIsSameOrigin} from '@/lib/auth';
import {equipmentById} from '@/lib/equipment-catalog';
import {requireCapability,upsertEquipmentOverride,equipmentOverrides,audit} from '@/lib/operations-db';
export const runtime='nodejs';
const officialHosts=['canon.com','aputure.com','amarancreators.com','shure.com','rode.com','zoomcorp.com','dji.com','godox.com','gopro.com','manfrotto.com','sennheiser.com','smallrig.com','neewer.com','rokinon.com','venuslens.net','proaim.com','sekonic.com','cdn.shopify.com'];
function officialImage(input:string){if(!input)return true;try{const u=new URL(input);return u.protocol==='https:'&&!u.username&&!u.password&&officialHosts.some(h=>u.hostname===h||u.hostname.endsWith('.'+h))&&/\.(jpeg|jpg|png|webp)(\?|$)/i.test(u.pathname+u.search)}catch{return false}}
export async function POST(req:Request){
 if(!requestIsSameOrigin(req))return new Response('Forbidden',{status:403});
 const actor=await requireCapability('inventory.write');if(!actor)return new Response('Forbidden',{status:403});
 const f=await boundedForm(req);if(f instanceof Response)return f;const assetId=String(f.get('assetId')||''),item=equipmentById(assetId);
 if(!item)return new Response('Unknown asset',{status:404});
 const approved=String(f.get('approved')||'')==='yes'&&item.inventoryStatus==='ready',disabled=String(f.get('disabled')||'')==='yes';
 const photo=String(f.get('photoUrl')||'').trim(),notes=String(f.get('notes')||'').trim(),rate=String(f.get('rate')||'').trim();
 const existing=(await equipmentOverrides()).find(o=>o.asset_id===assetId);
 if(photo.length>1200||(!officialImage(photo)&&photo!==existing?.photo_url)||notes.length>700||(rate&&!/^\d{1,6}(\.\d{1,2})?$/.test(rate)))return new Response('Invalid equipment details or unofficial image URL',{status:400});
 const cents=rate?Math.round(Number(rate)*100):null;if(cents!==null&&(!Number.isSafeInteger(cents)||cents>10000000))return new Response('Rate out of bounds',{status:400});
 await upsertEquipmentOverride({asset_id:assetId,rental_approved:approved,disabled,photo_url:photo||null,daily_rate_cents:cents,item_notes:notes});
 await audit('equipment.updated','equipment',assetId,actor,null,{approved,disabled,hasOfficialPhoto:!!photo});
 return NextResponse.redirect(safeFormRedirect(req,'/team/equipment'),303);
}