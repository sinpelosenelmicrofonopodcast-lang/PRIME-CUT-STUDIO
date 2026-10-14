#!/usr/bin/env node
// Static source assertions, no build/deploy/Adobe/Supabase calls.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const home=read('app/page.tsx'),portfolio=read('app/portfolio/page.tsx'),lib=read('lib/photo-galleries.ts'),
admin=read('app/admin/galleries/page.tsx'),api=read('app/api/admin/galleries/route.ts'),comp=read('components/LiveLightroomShowcase.tsx');
assert.match(home,/featuredPublicLightroomEmbed/);
assert.match(portfolio,/featuredPublicLightroomEmbed/);
assert.match(home,/revalidate=3600/);
assert.match(lib,/unstable_cache/);
assert.match(lib,/revalidate:3600/);
assert.match(lib,/gallery_type:'eq.portfolio',project_id:'is.null'/);
assert.match(lib,/validatedLightroomEmbedUrl/);
assert.match(api,/adminAuthenticated/);
assert.match(api,/revalidatePath\('\/'\)/);
assert.match(api,/revalidatePath\('\/portfolio'\)/);
assert.match(api,/consent/);
assert.match(admin,/name="embed"/);
assert.match(comp,/IntersectionObserver/);
assert.match(comp,/loading="lazy"/);
assert.ok(!/setInterval|setTimeout|fetch\(/.test(comp));
assert.deepEqual(JSON.parse(read('vercel.json')).git.deploymentEnabled,false);
console.log('PASS: live Lightroom embed owner-only, cached, same full source album; zero scheduled sync or deployments.');
