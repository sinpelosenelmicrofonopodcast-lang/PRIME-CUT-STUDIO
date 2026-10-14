import {randomUUID} from 'node:crypto';
import {NextResponse} from 'next/server';
import {operationsSession} from '@/lib/operations-db';
import {requestIsSameOrigin,sameOriginRedirect} from '@/lib/auth';
import {boundedForm} from '@/lib/form-request';
import {pricingCategories} from '@/lib/pricing';
import {pricingRows} from '@/lib/pricing-db';
import {comm} from '@/lib/communications-db';
export const runtime='nodejs';
export async function POST(request:Request){
 if(!requestIsSameOrigin(request))return new Response('Forbidden',{status:403});
 const actor=await operationsSession();if(!actor||!['owner','administrator'].includes(actor.role))return new Response('Forbidden',{status:403});
 const form=await boundedForm(request,32000);if(form instanceof Response)return form;
 const str=(key:string)=>String(form.get(key)||'').trim();const id=str('package');const category=pricingCategories.find(c=>c.packages.some(p=>p.id===id));const baseline=category?.packages.find(p=>p.id===id);
 if(!baseline||category?.published===false)return new Response('Unknown package',{status:400});
 const money=(key:string)=>/^\d{1,7}(\.\d{1,2})?$/.test(str(key))?Math.round(Number(str(key))*100):NaN;
 const price=money('price'),cost=str('cost')?money('cost'):0,order=Number(str('order'));
 if(!Number.isSafeInteger(price)||price<1||price>100000000||!Number.isSafeInteger(cost)||cost<0||!Number.isInteger(order)||order<0||order>1000||(id==='gun-n-run'&&price!==50000))return new Response('Invalid price, cost or order. Gun N Run must remain $500.',{status:400});
 const fields=['title_en','title_es','features_en','features_es','crew_en','crew_es','locations_en','locations_es','revisions_en','revisions_es','exclusions_en','exclusions_es','addons_en','addons_es'];
 if(fields.some(k=>str(k).length>2500)||!str('title_en')||!str('title_es'))return new Response('Invalid package content',{status:400});
 const en=str('features_en').split('\n').filter(Boolean),es=str('features_es').split('\n').filter(Boolean);if(!en.length||en.length!==es.length||en.length>20)return new Response('Use the same number of scope lines in English and Spanish.',{status:400});
 const pair=(key:string)=>({en:str(key+'_en'),es:str(key+'_es')});
 const pack={...baseline,title:pair('title'),features:id==='gun-n-run'?baseline.features:en.map((value,i)=>({en:value,es:es[i]})),featured:str('featured')==='yes',scope:{crew:pair('crew'),locations:pair('locations'),revisions:pair('revisions'),exclusions:pair('exclusions'),addons:pair('addons')}};
 const existing=(await pricingRows()).find(row=>row.metadata.package_id===id);
 const values={kind:'production-package-2026',name:pack.title.en,active:str('active')==='yes',base_price_cents:price,metadata:{package_id:id,service_slug:category!.slug,package:pack,display_order:order}};
 await comm(existing?'catalog_items?id=eq.'+existing.id:'catalog_items',{method:existing?'PATCH':'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify(existing?values:{id:randomUUID(),...values})});
 await comm('pc_pricing_costs?on_conflict=package_id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({package_id:id,cost_cents:cost,updated_at:new Date().toISOString()})});
 return NextResponse.redirect(sameOriginRedirect(request,'/team/pricing?saved=1#'+id),303);
}
