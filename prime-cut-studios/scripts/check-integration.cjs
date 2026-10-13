/** Prime Cut Studios v0.3 pre-deployment checks. No remote requests, writes or deployments. */
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const sql=read('supabase/migrations/20261013030000_primecuts_persistent_storage.sql');
const db=read('lib/db.ts');
const auth=read('lib/auth.ts');
const env=read('.env.example');
const expected=['pc_inquiries','pc_projects','pc_deliverables','pc_portfolio_entries','pc_admin_attempts'];
for(const table of expected){
 assert(sql.includes(`CREATE TABLE IF NOT EXISTS public.${table}`),`${table} missing from migration`);
 assert(sql.includes(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`),`${table} missing RLS`);
}
assert(sql.includes('REVOKE ALL ON TABLE public.pc_inquiries'), 'Private table permissions missing');
assert(sql.includes("'primecuts-portfolio', 'primecuts-portfolio', false"),'Private portfolio bucket missing');
assert(db.includes('/rest/v1/'),'Supabase REST persistence not implemented');
assert(db.includes('/storage/v1/'),'Supabase storage API not implemented');
assert(!db.includes('node:sqlite') && !db.includes('node:fs'), 'Local SQLite/filesystem persistence detected');
assert(db.includes('SUPABASE_SECRET_KEY') && !db.includes('NEXT_PUBLIC_SUPABASE_SECRET_KEY'), 'Server secret configuration is unsafe');
assert(auth.includes('timingSafeEqual'), 'Authentication timing-safe comparison missing');
assert(env.includes('SUPABASE_SECRET_KEY=') && env.includes('SESSION_SECRET='), 'Required setup entries missing');
console.log('PASS: Supabase private schema, storage, server-only access, no SQLite, admin secrets');
