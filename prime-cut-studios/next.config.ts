import type {NextConfig} from 'next';
const nextConfig:NextConfig={
  reactStrictMode:true,
  poweredByHeader:false,
  outputFileTracingIncludes:{'/api/project-documents/*':['./private/references/*.jpg'],'/api/project-dossiers/*':['./private/dossiers/*.docx']},
  async headers(){return [
    {source:'/:path*',headers:[
      {key:'X-Content-Type-Options',value:'nosniff'},
      {key:'X-Frame-Options',value:'DENY'},
      {key:'Referrer-Policy',value:'no-referrer'},
      {key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=()'}
    ]},
    {source:'/admin/:path*',headers:[{key:'Cache-Control',value:'private, no-store, max-age=0'}]},
    {source:'/client/:path*',headers:[{key:'Cache-Control',value:'private, no-store, max-age=0'}]},
    {source:'/team/:path*',headers:[{key:'Cache-Control',value:'private, no-store, max-age=0'},{key:'X-Robots-Tag',value:'noindex, nofollow'}]},
    {source:'/talent/:path*',headers:[{key:'Cache-Control',value:'private, no-store, max-age=0'},{key:'X-Robots-Tag',value:'noindex, nofollow'}]}
  ];}
};
export default nextConfig;
