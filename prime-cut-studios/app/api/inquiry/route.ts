import {getPricingCatalog} from '@/lib/pricing-db';
import {randomUUID} from 'node:crypto';
import {boundedForm} from '@/lib/form-request';
import {enqueueEmail,enqueueOwnerIntake} from '@/lib/email';
import {comm,commEnabled} from '@/lib/communications-db';
import {NextResponse} from 'next/server';
import {createInquiry,identifyIp} from '@/lib/db';
import {services} from '@/lib/data';
import {findPricingCategory,pricingAddOns} from '@/lib/pricing';
import {dateOnly} from '@/lib/workspace-policy';
import {requestIsSameOrigin,safeIp,sameOriginRedirect} from '@/lib/auth';
export const runtime='nodejs';
export async function POST(request:Request){
  let language:'en'|'es'='en';
  if(!requestIsSameOrigin(request)) return new Response('Invalid request origin',{status:403});
  if(Number(request.headers.get('content-length')||0)>32_000) return new Response('Request too large',{status:413});
  try{
    const form=await boundedForm(request,32000);if(form instanceof Response)return form;
    if(String(form.get('website')||'').trim())return NextResponse.redirect(sameOriginRedirect(request,'/book?sent=1'),303);
    const val=(name:string,max:number)=>String(form.get(name)||'').trim().slice(0,max+1);
    const name=val('name',120),email=val('email',254).toLowerCase(),phone=val('phone',40),service=val('service',100),date=val('date',10),location=val('location',150),originalDetails=val('details',2000);
    const quoteMode=val('quote_mode',16)||'package',packageId=val('package',100),budgetRange=val('budget_range',50)||val('budget',50),amountText=val('budget_amount',20);language=val('language',5)==='es'?'es':'en';
    const requestId=val('request_id',36)||randomUUID();
    const category=(await getPricingCatalog()).find(c=>c.name===service||c.slug===service);
    const selectedPackage=category?.packages.find(p=>p.id===packageId);
    const extras=form.getAll('extras').map(v=>String(v));
    const budget=quoteMode==='custom'?`$${amountText}`:budgetRange;
    const amount=Number(amountText);
    const overview=[`Request mode: ${quoteMode==='custom'?'NAME YOUR BUDGET':'PACKAGE'}`,
      `Package: ${selectedPackage?selectedPackage.title.en+' (from $'+selectedPackage.price+')':'Help me choose / custom'}`,
      `Language: ${language}`,
      extras.length?`Requested add-ons: ${extras.map(i=>pricingAddOns[Number(i)]?.en).filter(Boolean).join('; ')}`:''].filter(Boolean).join('\n');
    const details=[overview,selectedPackage?'Scope at request: '+selectedPackage.features.map(f=>f.en).join('; '):'',originalDetails].filter(Boolean).join('\n\n');
    if(!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(requestId)||name.length<2||name.length>120||!/^\S+@\S+\.\S+$/.test(email)||email.length>254||phone.length>40||!services.some(s=>s.name===service)||originalDetails.length>2000||details.length>3000||location.length>150||budget.length>50||!['package','custom'].includes(quoteMode)||!!(packageId&&!selectedPackage)||extras.length>14||extras.some(i=>!/^\d{1,2}$/.test(i)||Number(i)>=pricingAddOns.length)||(quoteMode==='custom'&&(!/^\d{1,7}(\.\d{1,2})?$/.test(amountText)||!Number.isFinite(amount)||amount<0.01||amount>1000000))|| (date!==''&&!/^\d{4}-\d{2}-\d{2}$/.test(date)))
      return NextResponse.redirect(sameOriginRedirect(request,'/book?lang='+language+'&error=validation'),303);
    try{dateOnly(date);}catch{return NextResponse.redirect(sameOriginRedirect(request,'/book?lang='+language+'&error=date'),303);}
    if(date && date < new Intl.DateTimeFormat('en-CA',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()))return NextResponse.redirect(sameOriginRedirect(request,'/book?lang='+language+'&error=date'),303);
    const result=await createInquiry({name,email,phone:phone||null,service,event_date:date||null,location:location||null,budget:budget||null,details:details||null,request_id:requestId,request_snapshot:{language,mode:quoteMode,service,package:selectedPackage||null,proposed_budget:quoteMode==='custom'?amount:null,notes:originalDetails,extras:extras.map(i=>pricingAddOns[Number(i)])}},identifyIp(safeIp(request)));
    if(!result.ok) return NextResponse.redirect(sameOriginRedirect(request,'/book?lang='+language+'&error=limit'),303);
    try{await enqueueEmail('inquiry:'+result.id,email,'inquiry',language,'/client');}catch{/* Inquiry remains saved. */}
    try{await enqueueOwnerIntake('inquiry:'+result.id,{kind:'quote',name,email,phone,service,event_date:date,location,budget,details});}catch{/* Inquiry remains saved. */}
    if(commEnabled())try{await comm('pc_notifications',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({source_key:'intake:'+result.id,owner_only:true,account_id:null,project_id:null,title:`New quote request: ${service}${quoteMode==='custom'?' (Name Your Budget)':''}`,link:'/team'})});}catch{/* Inquiry remains saved and visible in staff workspace. */}
    return NextResponse.redirect(sameOriginRedirect(request,'/book?lang='+language+'&sent=1'),303);
  }catch(error){return NextResponse.redirect(sameOriginRedirect(request,'/book?lang='+language+'&error=server'),303);}
}
