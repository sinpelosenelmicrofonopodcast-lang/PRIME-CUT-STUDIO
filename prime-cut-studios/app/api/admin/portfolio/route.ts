import {sameOriginRedirect as safeFormRedirect} from '@/lib/auth';
import {boundedForm} from '@/lib/form-request';
import {NextResponse} from 'next/server';
import {randomUUID} from 'node:crypto';
import {adminAuthenticated,requestIsSameOrigin} from '@/lib/auth';
import {createPortfolioEntry,setPortfolioPublished,uploadPortfolioImage,deletePortfolioImage} from '@/lib/db';
export const runtime='nodejs';
function imageType(bytes:Buffer){
 if(bytes.subarray(0,3).equals(Buffer.from([0xff,0xd8,0xff])))return ['.jpg','image/jpeg'];
 if(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return ['.png','image/png'];
 if(bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP')return ['.webp','image/webp'];
 return null;
}
export async function POST(request:Request){
 if(!requestIsSameOrigin(request))return new Response('Invalid origin',{status:403});
 if(!await adminAuthenticated())return new Response('Unauthorized',{status:401});
 if(Number(request.headers.get('content-length')||0)>5*1024*1024)return new Response('Image too large',{status:413});
 const form=await boundedForm(request);if(form instanceof Response)return form;const action=String(form.get('action')||'create');
 if(action==='publish'){
  const id=String(form.get('id')||''),published=String(form.get('published')||'')==='1';
  if(!/^[\da-f-]{36}$/i.test(id)||!await setPortfolioPublished(id,published))return new Response('Consent is required to publish, or invalid entry',{status:400});
  return NextResponse.redirect(safeFormRedirect(request,'/admin#portfolio'),303);
 }
 const title=String(form.get('title')||'').trim(),category=String(form.get('category')||'').trim(),summary=String(form.get('summary')||'').trim(),videoUrl=String(form.get('videoUrl')||'').trim(),consent=String(form.get('consent'))==='yes';
 if(!consent)return new Response('Confirm written permission before adding the portfolio entry',{status:400});
 if(!title||title.length>140||summary.length>600||!['Photography','Events','Music Video','Commercial','Other'].includes(category))return new Response('Invalid portfolio entry',{status:400});
 if(videoUrl){try{const u=new URL(videoUrl);if(u.protocol!=='https:'||!['youtube.com','www.youtube.com','youtu.be','vimeo.com','www.vimeo.com'].includes(u.hostname))return new Response('Use a YouTube or Vimeo link',{status:400});}catch{return new Response('Invalid video URL',{status:400});}}
 const image=form.get('cover');
 if(!(image instanceof File)||image.size<50||image.size>4*1024*1024)return new Response('Select an image under 4 MB',{status:400});
 const bytes=Buffer.from(await image.arrayBuffer()),type=imageType(bytes);
 if(!type)return new Response('Only valid JPEG, PNG or WebP cover images are accepted',{status:400});
 const filename=randomUUID()+type[0];
 await uploadPortfolioImage(filename,bytes,type[1]);
 try {
  await createPortfolioEntry({title,category,summary,filename,mime:type[1],videoUrl:videoUrl||null,consent});
 }catch(err){await deletePortfolioImage(filename);throw err;}
 return NextResponse.redirect(safeFormRedirect(request,'/admin#portfolio'),303);
}
