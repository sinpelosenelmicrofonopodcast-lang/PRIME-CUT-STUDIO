import {sameOriginRedirect as safeFormRedirect} from '@/lib/auth';
import {NextResponse} from 'next/server';import {clearAdminSession,requestIsSameOrigin} from '@/lib/auth';
export async function POST(request:Request){if(!requestIsSameOrigin(request))return new Response('Invalid origin',{status:403});await clearAdminSession();return NextResponse.redirect(safeFormRedirect(request,'/admin/login'),303);}
