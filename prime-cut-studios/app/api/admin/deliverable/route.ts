import {NextResponse} from 'next/server';
import {adminAuthenticated,requestIsSameOrigin} from '@/lib/auth';
import {addDeliverable,toggleDeliverable} from '@/lib/db';
export const runtime='nodejs';
export async function POST(request:Request){
  if(!requestIsSameOrigin(request))return new Response('Invalid origin',{status:403});
  if(!await adminAuthenticated())return new Response('Unauthorized',{status:401});
  const form=await request.formData(),projectId=String(form.get('projectId')||'');
  if(!/^[\da-f-]{36}$/i.test(projectId))return new Response('Bad ID',{status:400});
  const action=String(form.get('action')||'add');
  if(action==='visibility'){
    const id=String(form.get('id')||''),visible=String(form.get('visible'))==='1';
    if(!/^[\da-f-]{36}$/i.test(id)||!toggleDeliverable(projectId,id,visible))return new Response('Cannot change asset',{status:400});
  }else{
    const title=String(form.get('title')||'').trim(),description=String(form.get('description')||'').trim(),url=String(form.get('url')||'').trim();
    if(!title||title.length>150||description.length>400||url.length>500)return new Response('Invalid asset',{status:400});
    if(url){try{const u=new URL(url);if(u.protocol!=='https:'||!['drive.google.com','docs.google.com'].includes(u.hostname))return new Response('Only Google Drive links are permitted',{status:400});}catch{return new Response('Invalid URL',{status:400});}}
    if(!addDeliverable(projectId,title,description,url||null))return new Response('No project',{status:404});
  }
  return NextResponse.redirect(new URL('/admin#deliverables',request.url),303);
}
