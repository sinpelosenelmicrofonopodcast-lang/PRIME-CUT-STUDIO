import {boundedForm} from '@/lib/form-request';
import {operationsSession} from '@/lib/operations-db';
import {roleCan} from '@/lib/operations-policy';
import {NextResponse} from 'next/server';
import {adminAuthenticated,requestIsSameOrigin,sameOriginRedirect} from '@/lib/auth';
import {createManualProject,normalizedEmail} from '@/lib/db';
export const runtime='nodejs';
export async function POST(request:Request){
  if(!requestIsSameOrigin(request))return new Response('Forbidden',{status:403});
  const actor=await operationsSession();if(!actor||!roleCan(actor.role,'projects.create'))return new Response('Unauthorized',{status:401});
  const f=await boundedForm(request);if(f instanceof Response)return f;
  const name=String(f.get('name')||'').trim(),email=normalizedEmail(String(f.get('email')||'')),title=String(f.get('title')||'').trim();
  const eventDate=String(f.get('eventDate')||''),location=String(f.get('location')||'').trim();
  if(name.length<2||name.length>120||!/^\S+@\S+\.\S+$/.test(email)||email.length>254||title.length<2||title.length>140||location.length>200||eventDate&&!/^\d{4}-\d{2}-\d{2}$/.test(eventDate))return new Response('Invalid project details',{status:400});
  await createManualProject({name,email,title,eventDate:eventDate||null,location:location||null});
  return NextResponse.redirect(sameOriginRedirect(request,'/admin#projects'),303);
}
