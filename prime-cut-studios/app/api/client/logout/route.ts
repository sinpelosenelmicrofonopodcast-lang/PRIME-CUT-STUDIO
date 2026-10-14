import {signOutAuth} from '@/lib/supabase-auth';
import {NextResponse} from 'next/server';
import {requestIsSameOrigin,sameOriginRedirect} from '@/lib/auth';
import {clearClientSession} from '@/lib/client-auth';
export async function POST(request:Request){
  if(!requestIsSameOrigin(request))return new Response('Forbidden',{status:403});
  await signOutAuth();await clearClientSession();
  return NextResponse.redirect(sameOriginRedirect(request,'/client/login'),303);
}
