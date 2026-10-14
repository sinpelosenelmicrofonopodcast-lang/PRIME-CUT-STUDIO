#!/usr/bin/env node
// Static checks only. No production, Adobe, network calls or deployments.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const files=['lib/photo-galleries.ts','app/admin/galleries/page.tsx','app/api/admin/galleries/route.ts','supabase/planned/20261013_lightroom_photo_galleries_NOT_APPLIED.sql','app/client/projects/[id]/page.tsx','app/portfolio/page.tsx'];
for(const p of files)assert.ok(fs.existsSync(path.join(root,p)),p+' missing');
const lib=read('lib/photo-galleries.ts'),admin=read('app/api/admin/galleries/route.ts'),migration=read('supabase/planned/20261013_lightroom_photo_galleries_NOT_APPLIED.sql'),client=read('app/client/projects/[id]/page.tsx'),port=read('app/portfolio/page.tsx');
assert.match(lib,/adobe\.ly/);assert.match(lib,/lightroom\.adobe\.com/);
assert.match(lib,/visibility:'eq\.client'/);assert.match(lib,/consent_confirmed:'eq\.true'/);
assert.match(admin,/adminAuthenticated\(\)/);assert.match(admin,/visibility:'draft'/);
assert.match(admin,/album\.gallery_type!=='portfolio'\|\|!consent/);
assert.match(client,/clientAuthenticated\(\)/);assert.match(client,/clientCanAccess\(account\.id,id\)/);
assert.match(port,/publicPhotoGalleries\(\)/);
assert.match(migration,/ENABLE ROW LEVEL SECURITY/);assert.match(migration,/pc_photo_galleries_public_consent/);
assert.ok(!files.some(p=>read(p).includes('4ikEAMg')),'private share link must not be committed');
console.log('PASS: private Lightroom galleries staging checks.');
