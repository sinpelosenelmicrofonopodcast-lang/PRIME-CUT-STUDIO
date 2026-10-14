import type {EquipmentItem} from './equipment-catalog';

export type EquipmentGroup<T extends EquipmentItem = EquipmentItem> = {
 key:string; name:string; units:T[]; quantity:number;
};

// Only remove explicit inventory unit numbers. Keep model, mount and kit variants distinct.
export function groupEquipment<T extends EquipmentItem>(items:T[]):EquipmentGroup<T>[] {
 const groups=new Map<string,EquipmentGroup<T>>();
 for(const item of items){
  const name=item.name.replace(/\s+#\d+\s*$/,'').trim();
  const key=item.category+'|'+name.normalize('NFKC').toLowerCase();
  const group=groups.get(key);
  if(group){group.units.push(item);group.quantity+=item.quantity;}
  else groups.set(key,{key,name,units:[item],quantity:item.quantity});
 }
 return [...groups.values()];
}
