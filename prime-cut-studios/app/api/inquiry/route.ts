import {NextResponse} from 'next/server';
import {createInquiry,identifyIp} from '@/lib/db';
import {services} from '@/lib/data';
import {requestIsSameOrigin,safeIp} from '@/lib/auth';
export const runtime='nodejs';
export async function POST(request:Request){
  if(!requestIsSameOrigin(request)) return new Response('Invalid request origin',{status:403});
  if(Number(request.headers.get('content-length')||0)>32_000) return new Response('Request too large',{status:413});
  try{
    const form=await request.formData();
    if(String(form.get('website')||'').trim())return NextResponse.redirect(new URL('/book?sent=1',request.url),303);
    const val=(name:string,max:number)=>String(form.get(name)||'').trim().slice(0,max+1);
    const name=val('name',120),email=val('email',254).toLowerCase(),phone=val('phone',40),service=val('service',100),date=val('date',10),location=val('location',150),budget=val('budget',50),details=val('details',3000);
    if(name.length<2||name.length>120||!/^\S+@\S+\.\S+$/.test(email)||email.length>254||phone.length>40||!services.some(s=>s.name===service)||details.length>3000||location.length>150||budget.length>50|| (date!==''&&!/^\d{4}-\d{2}-\d{2}$/.test(date)))
      return NextResponse.redirect(new URL('/book?error=validation',request.url),303);
    if(date && (Number.isNaN(Date.parse(date)) || date < new Date().toISOString().slice(0,10)))return NextResponse.redirect(new URL('/book?error=date',request.url),303);
    const result=await createInquiry({name,email,phone:phone||null,service,event_date:date||null,location:location||null,budget:budget||null,details:details||null},identifyIp(safeIp(request)));
    if(!result.ok) return NextResponse.redirect(new URL('/book?error=limit',request.url),303);
    return NextResponse.redirect(new URL('/book?sent=1',request.url),303);
  }catch(error){console.error('Inquiry error',error);return NextResponse.redirect(new URL('/book?error=server',request.url),303);}
}
