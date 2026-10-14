// Test process only: keep the app's configured Supabase origin, route it to the
// isolated HTTP/SQL adapter. Never load this module in production.
const nativeFetch=globalThis.fetch;
globalThis.fetch=(input,init)=>{
 const value=typeof input==='string'?input:input instanceof URL?input.href:input.url;
 if(value.startsWith('https://primecuts-controlled-qa.supabase.co/')){
  const url=process.env.PRIMECUTS_QA_BACKEND+value.slice('https://primecuts-controlled-qa.supabase.co'.length);
  return nativeFetch(input instanceof Request?new Request(url,input):url,init);
 }
 return nativeFetch(input,init);
};
