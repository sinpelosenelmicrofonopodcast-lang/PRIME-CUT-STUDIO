import 'server-only';
import {comm} from './communications-db';
import {storageConfigured} from './db';
import {pricingCategories,type PricingCategory,type ProductionPackage} from './pricing';
type CatalogRow={id:string;name:string;description:string|null;active:boolean;base_price_cents:number;metadata:{package_id?:string;service_slug?:string;package?:ProductionPackage;display_order?:number;}};
export async function pricingRows(){return comm<CatalogRow[]>('catalog_items?kind=eq.production-package-2026&select=id,name,description,active,base_price_cents,metadata');}
export async function getPricingCatalog():Promise<PricingCategory[]>{
 if(!storageConfigured())return pricingCategories.filter(c=>c.published!==false);
 const rows=await pricingRows();
 return pricingCategories.filter(c=>c.published!==false).map(category=>({...category,packages:category.packages.map(pack=>{
  const row=rows.find(r=>r.metadata.package_id===pack.id&&r.metadata.service_slug===category.slug);if(!row)return pack;if(!row.active)return null;
  const saved=row.metadata.package;
  return {...pack,price:pack.id==='gun-n-run'?500:row.base_price_cents/100,title:saved?.title||pack.title,features:pack.id==='gun-n-run'?pack.features:saved?.features||pack.features,featured:saved?.featured??pack.featured,scope:saved?.scope,sort:row.metadata.display_order||0};
 }).filter((p):p is NonNullable<typeof p>=>p!==null).sort((a,b)=>('sort' in a?Number(a.sort):0)-('sort' in b?Number(b.sort):0))}));
}

export async function pricingCosts(){return comm<{package_id:string;cost_cents:number}[]>('pc_pricing_costs?select=package_id,cost_cents');}
