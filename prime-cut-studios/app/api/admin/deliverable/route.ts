import {sameOriginRedirect as safeFormRedirect} from '@/lib/auth';
import {boundedForm} from '@/lib/form-request';
import {NextResponse} from 'next/server';
import {adminAuthenticated,requestIsSameOrigin} from '@/lib/auth';
import {addReviewLink,toggleDeliverable,validatedReviewUrl,type ReviewProvider} from '@/lib/db';
export const runtime='nodejs';
export async function POST(request:Request){
  if(!requestIsSameOrigin(request))return new Response('Invalid origin',{status:403});
  if(!await adminAuthenticated())return new Response('Unauthorized',{status:401});
  const form=await boundedForm(request);if(form instanceof Response)return form;const projectId=String(form.get('projectId')||'');
  if(!/^[\da-f-]{36}$/i.test(projectId))return new Response('Bad ID',{status:400});
  const action=String(form.get('action')||'add');
  if(action==='visibility'){
    const id=String(form.get('id')||''),visible=String(form.get('visible'))==='1';
    if(!/^[\da-f-]{36}$/i.test(id)||!await toggleDeliverable(projectId,id,visible))return new Response('Cannot change asset',{status:400});
  }else{
    const title=String(form.get('title')||'').trim(),description=String(form.get('description')||'').trim();
    const url=String(form.get('url')||'').trim(),provider=String(form.get('provider')||'') as ReviewProvider;
    if(!title||title.length>150||description.length>400||url.length>1000||!['drive','lightroom','blackmagic'].includes(provider)||!validatedReviewUrl(provider,url))return new Response('Invalid review URL. Use an official Drive, Lightroom or Blackmagic link.',{status:400});
    if(!await addReviewLink(projectId,title,description,provider,url))return new Response('No project',{status:404});
  }
  return NextResponse.redirect(safeFormRedirect(request,'/admin#deliverables'),303);
}
