const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm');
const code=ts.transpileModule(fs.readFileSync('lib/smtp-config.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
const moduleResult={exports:{}};vm.runInNewContext('(function(module,exports,process){'+code+'})',{})(moduleResult,moduleResult.exports,process);
const config=moduleResult.exports.smtpConfiguration;let count=0;function test(name,fn){fn();count++;console.log('PASS: '+name);}
const legacy={SMTP_HOST:'smtp.example.test',SMTP_USER:'owner@example.test',SMTP_PASS:'controlled-test-only'};
test('existing SMTP_PASS credential enables mail without changing secrets',()=>assert.ok(config(legacy)));
test('MAIL_SMTP values take precedence and SMTP_PASS fills only missing password',()=>{const c=config({...legacy,MAIL_SMTP_HOST:'preferred.example.test',MAIL_SMTP_USER:'preferred@example.test'});assert.equal(c.transport.host,'preferred.example.test');assert.equal(c.transport.auth.pass,legacy.SMTP_PASS);});
test('preferred password is preserved',()=>assert.equal(config({...legacy,MAIL_SMTP_PASSWORD:'preferred-test'}).transport.auth.pass,'preferred-test'));
test('465 uses implicit TLS',()=>assert.equal(config(legacy).transport.secure,true));
test('587 requires STARTTLS',()=>{const c=config({...legacy,SMTP_PORT:'587'});assert.equal(c.transport.secure,false);assert.equal(c.transport.requireTLS,true);});
test('invalid ports and incomplete credentials fail closed',()=>{for(const port of ['25','bad','0'])assert.equal(config({...legacy,SMTP_PORT:port}),null);assert.equal(config({SMTP_HOST:legacy.SMTP_HOST}),null);});
test('configured sender alias is retained',()=>assert.equal(config({...legacy,SMTP_FROM:'Studio <alias@example.test>'}).from,'Studio <alias@example.test>'));
console.log(count+' SMTP configuration checks passed.');
