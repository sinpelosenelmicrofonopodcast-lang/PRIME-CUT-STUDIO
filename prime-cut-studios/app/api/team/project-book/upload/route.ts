import {allowAction,commEnabled} from '@/lib/communications-db';
import {scheduleMail} from '@/lib/email';
import {randomUUID} from 'node:crypto';import {NextResponse} from 'next/server';import {requestIsSameOrigin,sameOriginRedirect} from '@/lib/auth';import {projectBookEnabled} from '@/lib/project-book-policy';import {uuid} from '@/lib/workspace-policy';import {requireCapability,audit} from '@/lib/operations-db';import {attachBookFile,uploadBookFile,deleteBookFile} from '@/lib/project-book-db';
export const runtime='nodejs';
export async function POST(req:Request){
 if(!projectBookEnabled())return new Response('Upgrade not active',{status:503});
 if(!requestIsSameOrigin(req))return new Response('Forbidden',{status:403});
 // Authorize before accepting large file bodies; scope comes from URL, not uploaded form.
 const projectId=new URL(req.url).searchParams.get('project')||'';if(!uuid(projectId))return new Response('Invalid project',{status:400});
 const actor=await requireCapability('projects.write',projectId);if(!actor)return new Response('Forbidden',{status:403});
 if(commEnabled()&&!await allowAction('upload:'+(actor.accountId||'owner')+':'+projectId,20,3600))return new Response('Too many uploads',{status:429});
 const reader=req.body?.getReader();if(!reader)return new Response('No file',{status:400});const parts:Uint8Array[]=[];let size=0;
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>4*1024*1024){await reader.cancel();return new Response('Document too large',{status:413});}parts.push(value);}
 const bytes=new Uint8Array(size);let offset=0;for(const p of parts){bytes.set(p,offset);offset+=p.length;}
 let form:FormData;try{form=await new Request(req.url,{method:'POST',headers:{'Content-Type':req.headers.get('content-type')||''},body:bytes}).formData();}catch{return new Response('Invalid upload',{status:400});}
 const file=form.get('file'),title=String(form.get('title')||'').trim(),description=String(form.get('description')||'').trim();
 if(!(file instanceof File)||file.size<12||file.size>3*1024*1024||title.length<2||title.length>160||description.length>3000)return new Response('Choose a PDF or image, maximum 3 MB',{status:400});
 const data=new Uint8Array(await file.arrayBuffer());let mime='',ext='';
 if(Buffer.from(data.subarray(0,5)).toString()==='%PDF-'){mime='application/pdf';ext='pdf';}
 else if(data[0]===0xff&&data[1]===0xd8&&data[2]===0xff){mime='image/jpeg';ext='jpg';}
 else if(Buffer.from(data.subarray(0,8)).equals(Buffer.from([137,80,78,71,13,10,26,10]))){mime='image/png';ext='png';}
 else if(Buffer.from(data.subarray(0,4)).toString()==='RIFF'&&Buffer.from(data.subarray(8,12)).toString()==='WEBP'){mime='image/webp';ext='webp';}
 if(!mime||file.type!==mime)return new Response('File type does not match content',{status:415});
 const objectPath=projectId+'/'+randomUUID()+'.'+ext,filename=file.name.replace(/[\x00-\x1f\x7f/\\]/g,'_').slice(0,160)||'document.'+ext;
 await uploadBookFile(objectPath,data,mime);
 try{await attachBookFile(projectId,title,description,objectPath,filename,mime,form.get('visible')==='yes',form.get('placement')==='reference'?'reference':'document');}catch{await deleteBookFile(objectPath);return new Response('Could not attach file; upload removed',{status:503});}
 scheduleMail();
 await audit('project_book.upload','document',null,actor,projectId);
 return NextResponse.redirect(sameOriginRedirect(req,'/team/projects/'+projectId+'?saved=1#production-book'),303);
}
