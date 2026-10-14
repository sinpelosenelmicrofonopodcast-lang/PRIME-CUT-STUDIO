import {prepareCastingPhoto,uploadCastingPhotos,deleteCastingPhotos} from '@/lib/casting-photos';
import {allowAction,commEnabled} from '@/lib/communications-db';
import {scheduleMail} from '@/lib/email';
import {boundedForm} from '@/lib/form-request';
import {NextResponse} from 'next/server';import {requestIsSameOrigin,safeIp,sameOriginRedirect} from '@/lib/auth';
import {normalizedEmail,identifyIp} from '@/lib/db';
import {workspaceEnabled,safeProfessionalUrl} from '@/lib/workspace-policy';
import {applyWithTalent} from '@/lib/workspace-db';
import {castingById,castingApplyCount,applyCasting,castingPhotosSaved} from '@/lib/operations-db';
export const runtime='nodejs';
export async function POST(req:Request){
 if(!requestIsSameOrigin(req))return new Response('Forbidden',{status:403});
 if(Number(req.headers.get('content-length')||0)>3500000)return new Response('Request too large',{status:413});
 const f=await boundedForm(req,3500000);if(f instanceof Response)return f;
 if(String(f.get('website')||'').trim())return NextResponse.redirect(sameOriginRedirect(req,'/casting?sent=1'),303);
 const id=String(f.get('callId')||''),name=String(f.get('fullName')||'').trim(),email=normalizedEmail(String(f.get('email')||'')),phone=String(f.get('phone')||'').trim(),city=String(f.get('city')||'').trim(),portfolio=String(f.get('portfolioUrl')||'').trim(),headshot=String(f.get('headshotUrl')||'').trim(),experience=String(f.get('experience')||'').trim(),availability=String(f.get('availability')||'').trim();
 if(!/^[\da-f-]{36}$/i.test(id)||name.length<2||name.length>140||!/^(\S+)@(\S+)\.(\S+)$/.test(email)||email.length>254||phone.length>40||city.length>100||portfolio.length>500||headshot.length>500||experience.length>1800||availability.length>500||!safeProfessionalUrl(portfolio)||!safeProfessionalUrl(headshot)||(String(f.get('consent'))!=='yes'||String(f.get('adult'))!=='yes'))return new Response('Invalid application',{status:400});
 const call=await castingById(id,true);if(!call||call.closes_at&&Date.parse(call.closes_at)<Date.now())return new Response('Casting not open',{status:410});
 const hash=identifyIp(safeIp(req));if((await castingApplyCount(hash)).length>=5)return new Response('Too many applications',{status:429});
 const photos=f.getAll('photos').filter((v):v is File=>v instanceof File&&v.size>0);
 if(photos.length>3)return new Response('Selecciona hasta 3 fotos.',{status:400});
 let photoPaths:string[]=[];
 if(photos.length){
  if(commEnabled()&&!await allowAction('casting-photo:'+hash,5,3600))return new Response('Too many uploads',{status:429});
  let images:Buffer[];try{images=[];for(const photo of photos)images.push(await prepareCastingPhoto(photo));}catch(e){return new Response(e instanceof Error?e.message:'Foto inválida',{status:400});}
  try{photoPaths=await uploadCastingPhotos(images);}catch{return new Response('No se pudieron guardar tus fotos. Intenta más tarde.',{status:503});}
 }
 const data={photo_paths:photoPaths,casting_call_id:id,full_name:name,email,phone:phone||null,city:city||null,portfolio_url:portfolio||null,headshot_url:headshot||null,experience:experience||null,availability:availability||null,consent_at:new Date().toISOString(),ip_hash:hash};
 try{if(workspaceEnabled()){const token=await applyWithTalent(data,f.get('talentBank')==='yes',f.get('clientMaterial')==='yes');scheduleMail();if(token)return NextResponse.redirect(sameOriginRedirect(req,'/talent/manage/'+token),303);}else {await applyCasting(data);scheduleMail();}}
 catch{if(photoPaths.length){try{if(!await castingPhotosSaved(id,email,photoPaths))await deleteCastingPhotos(photoPaths);}catch{/* Preserve photos if persistence outcome cannot be verified. */}}return new Response('Application already submitted or temporarily unavailable',{status:409});}
 return NextResponse.redirect(sameOriginRedirect(req,'/casting?sent=1'),303);
}