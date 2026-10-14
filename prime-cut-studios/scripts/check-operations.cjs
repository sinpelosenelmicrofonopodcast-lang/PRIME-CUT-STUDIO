#!/usr/bin/env node
// Static-only checks. NO network, production database or deployment.
const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
for(const file of ['app/rentals/page.tsx','components/RentalCatalog.tsx','lib/equipment-catalog.ts','app/api/rentals/request/route.ts','app/team/equipment/page.tsx','app/team/staff/page.tsx','app/api/team/staff/assignment/route.ts','app/team/leads/page.tsx','app/api/team/leads/route.ts','app/team/casting/page.tsx','app/casting/page.tsx','app/casting/[id]/page.tsx','app/api/casting/apply/route.ts','app/team/reservations/page.tsx','lib/operations-db.ts','lib/operations-reservations.ts','supabase/planned/20261013_operations_casting_rentals_NOT_APPLIED.sql','supabase/planned/20261013_equipment_reservations_NOT_APPLIED.sql'])assert.ok(fs.existsSync(path.join(root,file)),'missing '+file);
const cat=read('lib/equipment-catalog.ts'),items=JSON.parse(cat.split('export const equipmentCatalog:EquipmentItem[] = ')[1].split(';\nexport const equipmentById')[0]);
assert.ok(items.length>=164);
assert.equal(new Set(items.map(x=>x.id)).size,items.length);
assert.equal(items.filter(x=>x.inventoryStatus==='ready').length,161);
assert.ok(items.every(x=>!('serial' in x)&&!('purchasePrice' in x)&&!('cost' in x)));
assert.ok(items.every(x=>x.rentalApproval!=='approved'),'do not auto-authorize rentals');
for(const id of ['BB-CAM-0009','BB-CAM-0010','BB-MON-0004'])assert.notEqual(items.find(x=>x.id===id)?.inventoryStatus,'ready');
for(const [f,re] of [
 ['app/api/rentals/request/route.ts',/overrides\.get\(id\)\?\.disabled/],
 ['app/api/casting/apply/route.ts',/consent_at:/],
 ['app/api/casting/apply/route.ts',/adult/],
 ['lib/operations-db.ts',/scopeCan\(/],
 ['app/api/team/casting/review/route.ts',/requireCapability\('casting.review'/],
 ['app/api/team/tasks/route.ts',/requireCapability\('tasks.write'/],
 ['app/api/team/staff/assignment/route.ts',/adminAuthenticated\(/],
 ['supabase/planned/20261013_operations_casting_rentals_NOT_APPLIED.sql',/ROW LEVEL SECURITY/],
 ['supabase/planned/20261013_equipment_reservations_NOT_APPLIED.sql',/pg_advisory_xact_lock/],
 ['supabase/planned/20261013_equipment_reservations_NOT_APPLIED.sql',/pc_confirm_equipment_booking/],
 ['app/api/admin/inquiry/route.ts',/issueClientInvite/]
])assert.match(read(f),re,'missing security gate: '+f);
assert.deepEqual(JSON.parse(read('vercel.json')).git.deploymentEnabled,false);
console.log('PASS: static PrimeCuts operations policy/catalog checks. No network or writes.');
