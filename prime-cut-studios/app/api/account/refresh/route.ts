import {NextResponse} from 'next/server';import {verifiedAuthUser} from '@/lib/supabase-auth';import {sameOriginRedirect} from '@/lib/auth';
export const runtime='nodejs';
export async function GET(req:Request){const u=await verifiedAuthUser(true);const url=new URL(req.url),next=url.searchParams.get('next')||'/client';const safe=/^\/(client|team)(\/[^?#]*)?(\?[^#]*)?$/.test(next)&&!next.includes('\\')?next:'/client';return NextResponse.redirect(sameOriginRedirect(req,u?safe:'/client/login'),303);}
