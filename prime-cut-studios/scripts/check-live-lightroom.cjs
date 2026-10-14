#!/usr/bin/env node
// Pure offline static checks. Does not connect to Lightroom/Vercel/Supabase or build.
const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
const p=x=>fs.readFileSync(path.join(__dirname,'..',x),'utf8');
const album=p('lib/featured-lightroom.ts'),showcase=p('components/LiveLightroomShowcase.tsx'),
home=p('app/page.tsx'),portfolio=p('app/portfolio/page.tsx'),css=p('app/globals.css');
assert.match(album,/https:\/\/lightroom\.adobe\.com\/shares\/5b61ae7322144a77ba85dc2cca5e866f/);
assert.match(home,/LiveLightroomShowcase/);
assert.match(portfolio,/LiveLightroomShowcase/);
assert.match(showcase,/IntersectionObserver/);
assert.match(showcase,/loading="lazy"/);
assert.match(showcase,/rel="noopener noreferrer"/);
assert.match(showcase,/referrerPolicy="strict-origin-when-cross-origin"/);
assert.match(showcase,/embed\/shares/);
assert.match(showcase,/lightroom\.adobe\.com/);
assert.ok(!/setInterval|setTimeout|fetch\(|XMLHttpRequest|upload\(/.test(showcase));
assert.match(css,/prefers-reduced-motion/);
assert.deepEqual(JSON.parse(p('vercel.json')).git.deploymentEnabled,false);
console.log('PASS: complete Lightroom album uses the dedicated slideshow embed, no polling or extra media storage.');
