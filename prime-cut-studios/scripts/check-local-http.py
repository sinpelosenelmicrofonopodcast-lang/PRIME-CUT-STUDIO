import subprocess,urllib.request,urllib.error,time,json,pathlib,os
port=3231
proc=subprocess.Popen(['node','node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port',str(port)],stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
class NoRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,*args):return None
opener=urllib.request.build_opener(urllib.request.ProxyHandler({}),NoRedirect())
base='http://127.0.0.1:'+str(port)
def request(path,body=None,headers=None):
 try:r=opener.open(urllib.request.Request(base+path,data=body,headers=headers or {}),timeout=20)
 except urllib.error.HTTPError as e:r=e
 content=r.read();return {'path':path,'status':r.status,'location':r.headers.get('Location'),'bytes':len(content)}
try:
 for _ in range(40):
  try:opener.open(base+'/account',timeout=2);break
  except Exception:time.sleep(.25)
 results=[]
 for path in ['/','/account','/account/verify','/client/login','/book','/rentals','/services','/casting','/privacy','/terms','/robots.txt']:
  result=request(path);assert result['status']==200,result;results.append(result);print('PASS:',result,flush=True)
 for path in ['/client','/team']:
  result=request(path);assert result['status']==307 and result['location']=='/client/login',result;results.append(result);print('PASS:',result,flush=True)
 for path in ['/api/inquiry','/api/rentals/request','/api/client/login','/api/admin/login','/api/team/equipment/photo']:
  result=request(path,b'name=Test',{'Content-Type':'application/x-www-form-urlencoded','Origin':'https://foreign.example','Sec-Fetch-Site':'cross-site'});assert result['status']==403,result;results.append(result);print('PASS: cross-origin',result,flush=True)
 result=request('/api/inquiry',b'name=x',{'Content-Type':'application/x-www-form-urlencoded','Origin':base,'Sec-Fetch-Site':'same-origin'});assert result['status']==303 and result['location']==base+'/book?error=validation',result;results.append(result);print('PASS: validation redirects stay on local origin',result,flush=True)
 pathlib.Path('docs/audit-http-results.json').write_text(json.dumps(results,indent=2))
 print(str(len(results))+' real local HTTP checks passed; no provider keys or client writes.')
finally:
 proc.terminate()
 try:output=proc.communicate(timeout=3)[0]
 except subprocess.TimeoutExpired:proc.kill();output=proc.communicate()[0]
 pathlib.Path('docs/audit-http-server.log').write_text(output)
