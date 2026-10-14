// Fixture-free browser checks against the local production build, with no provider keys.
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3239'],{stdio:'ignore'});
 let browser;const results=[];
 const test=async(name,fn)=>{await fn();results.push({name,status:'PASS'});console.log('PASS: '+name);};
 try{
  for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:3239/services')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
  browser=await chromium.launch({executablePath:chromium.executablePath(),headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:3239/services');
  await test('48 scoped package cards, Gun N Run $500, two actions per card and no Real Estate',async()=>{assert.equal(await page.locator('.pricing-card').count(),48);assert.equal(await page.locator('#price-music-video .pricing-card').first().locator('.pricing-amount').innerText(),'$500');assert.equal(await page.locator('#price-real-estate').count(),0);assert.equal(await page.locator('.pricing-card .pricing-actions a').count(),96);});
  fs.mkdirSync('docs/release-evidence',{recursive:true});await page.screenshot({path:'docs/release-evidence/catalog-desktop.png'});
  await page.getByRole('button',{name:'Español',exact:true}).click();
  await test('Spanish package selection preserves language and selected package in quote form',async()=>{await page.locator('#price-music-video .pricing-card').first().getByRole('link',{name:'Elegir paquete'}).click();await page.waitForURL('**/book?**');assert.equal(await page.locator('input[name=language]').inputValue(),'es');assert.equal(await page.locator('select[name=package]').inputValue(),'gun-n-run');assert.ok(await page.getByRole('button',{name:'Enviar solicitud de cotización'}).isVisible());});
  await page.getByRole('radio',{name:'Dinos tu presupuesto',exact:true}).check();await page.getByLabel('Tu presupuesto total (USD) *').fill('350.25');
  await test('exact custom budget below $500 is valid and request has an idempotency key',async()=>{assert.equal(await page.locator('input[name=budget_amount]').evaluate(el=>el.checkValidity()),true);assert.match(await page.locator('input[name=request_id]').inputValue(),/^[a-f0-9-]{36}$/);});
  await page.setViewportSize({width:390,height:844});await page.goto('http://127.0.0.1:3239/services?lang=es');
  await test('mobile package grid fits viewport and navigation retains Spanish',async()=>{assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));assert.equal(await page.locator('.pricing-card-grid').first().evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length),1);await page.getByRole('button',{name:'Open menu'}).click();assert.ok(await page.getByRole('link',{name:'Servicios',exact:true}).isVisible());});
  await page.screenshot({path:'docs/release-evidence/catalog-mobile.png'});
  await test('no client-side application exceptions',async()=>assert.deepEqual(errors,[]));
 }finally{if(browser)await browser.close();server.kill('SIGTERM');fs.mkdirSync('docs/release-evidence',{recursive:true});fs.writeFileSync('docs/release-evidence/BROWSER_QA.json',JSON.stringify(results,null,2));}
})().catch(error=>{console.error(error);process.exitCode=1});
