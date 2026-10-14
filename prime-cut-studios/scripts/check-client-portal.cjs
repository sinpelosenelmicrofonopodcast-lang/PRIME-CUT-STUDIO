const {readFileSync}=require('node:fs');
const {join}=require('node:path');
function src(path){return readFileSync(join(__dirname,'..',path),'utf8');}
const checks=[
 ['client login is required',src('app/client/page.tsx').includes("redirect('/client/login')")],
 ['project membership enforced',src('app/client/projects/[id]/page.tsx').includes('clientCanAccess(account.id,id)')],
 ['old bearer-token portal disabled',!src('app/client/[token]/page.tsx').includes('getClientProject')],
 ['admin review link requires authentication',src('app/api/admin/deliverable/route.ts').includes('adminAuthenticated()')],
 ['invite access is one-use and expiring',src('supabase/migrations/20261013190000_client_review_portal.sql').includes('redeemed_at IS NULL AND expires_at>now()')],
 ['password hashes are scrypt',src('lib/client-auth.ts').includes('scryptSync')],
 ['supabase tables protected',src('supabase/migrations/20261013190000_client_review_portal.sql').includes('ENABLE ROW LEVEL SECURITY')],
 ['review URLs validate provider',src('lib/db.ts').includes('validatedReviewUrl')],
 ['external links use noopener',src('components/workspace/ClientProjectDashboard.tsx').includes('rel="noopener noreferrer"')&&src('components/workspace/ProductionBook.tsx').includes('rel="noopener noreferrer"')],
 ['embedded provider gallery is sandboxed',!src('app/client/projects/[id]/page.tsx').includes('<iframe')||src('app/client/projects/[id]/page.tsx').includes('sandbox="allow-scripts allow-same-origin allow-forms allow-popups"')],
];
for(const [name,ok] of checks)console.log(`${ok?'PASS':'FAIL'}: ${name}`);
if(checks.some(([,ok])=>!ok))process.exitCode=1;
