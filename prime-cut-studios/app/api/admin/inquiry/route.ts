import {NextResponse} from 'next/server';
import {adminAuthenticated,requestIsSameOrigin} from '@/lib/auth';
import {convertInquiry} from '@/lib/db';
import {cookies} from 'next/headers';
export const runtime='nodejs';
export async function POST(request:Request){
  if(!requestIsSameOrigin(request))return new Response('Invalid origin',{status:403});
  if(!await adminAuthenticated())return new Response('Unauthorized',{status:401});
  const form=await request.formData();const id=String(form.get('id')||'');
  if(!/^[\da-f-]{36}$/i.test(id))return new Response('Invalid inquiry',{status:400});
  const result=await convertInquiry(id);
  if(!result)return new Response('Not found',{status:404});
  if(result.token){(await cookies()).set('primecuts_portal_flash',JSON.stringify({id:result.projectId,token:result.token}),{httpOnly:true,sameSite:'strict',secure:process.env.NODE_ENV==='production',path:'/admin',maxAge:300});}
  return NextResponse.redirect(new URL('/admin#projects',request.url),303);
}
