/** Offline integration smoke tests. No live customer records are touched. */
const fs=require('node:fs');const path=require('node:path');const os=require('node:os');
const ts=require('typescript');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'primecuts-smoke-'));
process.env.PRIMECUTS_DB_PATH=path.join(dir,'test.sqlite');
const input=fs.readFileSync(path.join(__dirname,'..','lib','db.ts'),'utf8');
const output=ts.transpileModule(input,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const temp=path.join(dir,'db.cjs');fs.writeFileSync(temp,output);
const d=require(temp);const assert=require('node:assert/strict');
try{
 const one=d.createInquiry({name:'Sample Client',email:'sample@example.com',phone:null,service:'Music Videos',event_date:'2026-12-08',location:'Killeen',budget:null,details:'Integration test'},d.identifyIp('127.0.0.1'));
 assert(one.ok);assert.equal(d.listInquiries()[0].name,'Sample Client');
 const c=d.convertInquiry(one.id);assert(c.token);assert(d.getClientProject(c.token));
 assert(d.updateProject(c.projectId,{status:'editing',amount:120000,notes:'Test quote'}));
 assert.equal(d.getProject(c.projectId).quote_amount_cents,120000);
 d.addDeliverable(c.projectId,'Final edit','Test',null);
 const del=d.listDeliverables(c.projectId)[0];assert.equal(d.listDeliverables(c.projectId,true).length,0);
 d.toggleDeliverable(c.projectId,del.id,true);assert.equal(d.listDeliverables(c.projectId,true).length,1);
 const next=d.regeneratePortalToken(c.projectId);assert(d.getClientProject(next));assert.equal(d.getClientProject(c.token),undefined);
 const p=d.createPortfolioEntry({title:'Demo draft',category:'Commercial',summary:'Test',filename:'12345678-1234-1234-1234-123456789012.jpg',mime:'image/jpeg',videoUrl:null,consent:true});
 assert.equal(d.listPortfolio(true).length,0);assert(d.setPortfolioPublished(p,true));assert.equal(d.listPortfolio(true).length,1);
 assert(d.setPortfolioPublished(p,false));assert.equal(d.listPortfolio(true).length,0);
 console.log('PASS: inquiries, private projects, quotes, portal revocation, deliveries, approved portfolio');
}finally{try{fs.rmSync(dir,{force:true,recursive:true})}catch{}}
