/** Private, server-side SQLite storage. Keep the data/ directory on persistent private disk. */
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { randomUUID, randomBytes, createHash } from 'node:crypto';

const dbFile = process.env.PRIMECUTS_DB_PATH || join(process.cwd(), 'data', 'primecuts.sqlite');
let cached: DatabaseSync | undefined;

function database(): DatabaseSync {
  if (cached) return cached;
  mkdirSync(dirname(dbFile), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(dbFile);
  db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
  db.exec(`
    CREATE TABLE IF NOT EXISTS inquiries (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT,
      service TEXT NOT NULL, event_date TEXT, location TEXT, budget TEXT, details TEXT,
      status TEXT NOT NULL DEFAULT 'new', ip_hash TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY, inquiry_id TEXT UNIQUE REFERENCES inquiries(id),
      client_name TEXT NOT NULL, client_email TEXT NOT NULL,
      title TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'planning',
      event_date TEXT, location TEXT, quote_amount_cents INTEGER,
      quote_notes TEXT NOT NULL DEFAULT '', portal_token_hash TEXT UNIQUE,
      portal_expires_at TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS deliverables (
      id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', url TEXT,
      visible INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS portfolio_entries (
      id TEXT PRIMARY KEY, title TEXT NOT NULL, category TEXT NOT NULL, summary TEXT NOT NULL,
      image_filename TEXT NOT NULL, image_mime TEXT NOT NULL, video_url TEXT,
      consent_confirmed INTEGER NOT NULL DEFAULT 0, published INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS admin_attempts (id INTEGER PRIMARY KEY AUTOINCREMENT, ip_hash TEXT NOT NULL, at TEXT NOT NULL DEFAULT (datetime('now')));
    CREATE INDEX IF NOT EXISTS inquiries_created_idx ON inquiries(created_at);
    CREATE INDEX IF NOT EXISTS inquiries_ip_idx ON inquiries(ip_hash,created_at);
    CREATE INDEX IF NOT EXISTS projects_status_idx ON projects(status);
    CREATE INDEX IF NOT EXISTS deliverables_project_idx ON deliverables(project_id);
    CREATE INDEX IF NOT EXISTS admin_attempts_idx ON admin_attempts(ip_hash,at);
  `);
  cached = db;
  return db;
}

export type Inquiry = { id: string; name: string; email: string; phone: string | null; service: string; event_date: string | null; location: string | null; budget: string | null; details: string | null; status: string; created_at: string };
export type Project = { id: string; inquiry_id: string | null; client_name: string; client_email: string; title: string; status: string; event_date: string | null; location: string | null; quote_amount_cents: number | null; quote_notes: string; portal_expires_at: string | null; created_at: string; updated_at: string };
export type PortfolioEntry = {id:string;title:string;category:string;summary:string;image_filename:string;image_mime:string;video_url:string|null;consent_confirmed:number;published:number;created_at:string};
export type Deliverable = { id: string; project_id: string; title: string; description: string; url: string | null; visible: number; created_at: string };
export const statuses = ['planning', 'quoted', 'contract', 'deposit-pending', 'scheduled', 'shooting', 'editing', 'client-review', 'delivered', 'archived'] as const;

export function hashToken(token: string) { return createHash('sha256').update(token).digest('hex'); }
export function identifyIp(ip: string) { return createHash('sha256').update((process.env.SESSION_SECRET || 'local') + ':' + ip).digest('hex'); }
export function listInquiries(): Inquiry[] { return database().prepare('SELECT id,name,email,phone,service,event_date,location,budget,details,status,created_at FROM inquiries ORDER BY created_at DESC LIMIT 200').all() as Inquiry[]; }
export function listProjects(): Project[] { return database().prepare('SELECT id,inquiry_id,client_name,client_email,title,status,event_date,location,quote_amount_cents,quote_notes,portal_expires_at,created_at,updated_at FROM projects ORDER BY updated_at DESC LIMIT 200').all() as Project[]; }
export function getProject(id: string): Project | undefined { return database().prepare('SELECT id,inquiry_id,client_name,client_email,title,status,event_date,location,quote_amount_cents,quote_notes,portal_expires_at,created_at,updated_at FROM projects WHERE id=?').get(id) as Project | undefined; }
export function listDeliverables(id: string, client = false): Deliverable[] { return database().prepare(`SELECT id,project_id,title,description,url,visible,created_at FROM deliverables WHERE project_id=? ${client ? 'AND visible=1' : ''} ORDER BY created_at DESC`).all(id) as Deliverable[]; }

export function createInquiry(data: Omit<Inquiry, 'id' | 'status' | 'created_at'>, ipHash: string) {
  const db = database();
  const recent = db.prepare("SELECT count(*) as total FROM inquiries WHERE ip_hash=? AND created_at > datetime('now','-1 hour')").get(ipHash) as {total:number};
  if (recent.total >= 5) return { ok: false, reason: 'rate_limit' } as const;
  const id = randomUUID();
  db.prepare('INSERT INTO inquiries(id,name,email,phone,service,event_date,location,budget,details,ip_hash) VALUES(?,?,?,?,?,?,?,?,?,?)')
    .run(id,data.name,data.email,data.phone,data.service,data.event_date,data.location,data.budget,data.details,ipHash);
  return {ok: true, id} as const;
}
export function convertInquiry(id: string) {
  const db=database();
  const inquiry = db.prepare('SELECT * FROM inquiries WHERE id=?').get(id) as Inquiry | undefined;
  if (!inquiry) return null;
  const existing = db.prepare('SELECT id FROM projects WHERE inquiry_id=?').get(id) as {id:string} | undefined;
  if (existing) return {projectId: existing.id, token: null};
  const token=randomBytes(32).toString('base64url');
  const expires = new Date(Date.now()+90*86400000).toISOString();
  const projectId=randomUUID();
  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare('INSERT INTO projects(id,inquiry_id,client_name,client_email,title,event_date,location,portal_token_hash,portal_expires_at) VALUES(?,?,?,?,?,?,?,?,?)')
      .run(projectId,id,inquiry.name,inquiry.email,inquiry.service,inquiry.event_date,inquiry.location,hashToken(token),expires);
    db.prepare("UPDATE inquiries SET status='converted' WHERE id=?").run(id);
    db.exec('COMMIT');
  } catch(error) { db.exec('ROLLBACK'); throw error; }
  return {projectId, token};
}
export function getClientProject(token: string): Project | undefined {
  if (!/^[A-Za-z0-9_-]{40,100}$/.test(token)) return undefined;
  return database().prepare('SELECT id,inquiry_id,client_name,client_email,title,status,event_date,location,quote_amount_cents,quote_notes,portal_expires_at,created_at,updated_at FROM projects WHERE portal_token_hash=? AND portal_expires_at > ?').get(hashToken(token),new Date().toISOString()) as Project | undefined;
}
export function regeneratePortalToken(id: string) {
  const project=getProject(id); if(!project) return null;
  const token=randomBytes(32).toString('base64url');
  database().prepare("UPDATE projects SET portal_token_hash=?,portal_expires_at=?,updated_at=datetime('now') WHERE id=?")
    .run(hashToken(token),new Date(Date.now()+90*86400000).toISOString(),id);
  return token;
}
export function updateProject(id:string, data:{status:string;amount:number|null;notes:string}) {
  if(!statuses.includes(data.status as typeof statuses[number])) return false;
  if(data.amount!==null && (!Number.isSafeInteger(data.amount)||data.amount<0||data.amount>100_000_000)) return false;
  return database().prepare("UPDATE projects SET status=?,quote_amount_cents=?,quote_notes=?,updated_at=datetime('now') WHERE id=?").run(data.status,data.amount,data.notes,id).changes===1;
}
export function addDeliverable(projectId:string,title:string,description:string,url:string|null) {
  if(!getProject(projectId)) return false;
  const id=randomUUID();
  database().prepare('INSERT INTO deliverables(id,project_id,title,description,url,visible) VALUES(?,?,?,?,?,0)').run(id,projectId,title,description,url);
  return true;
}
export function toggleDeliverable(projectId:string,id:string,visible:boolean) {
  return database().prepare('UPDATE deliverables SET visible=? WHERE id=? AND project_id=?').run(visible?1:0,id,projectId).changes===1;
}
export function adminLoginThrottled(ip:string) {
  const db=database();
  const row=db.prepare("SELECT count(*) as total FROM admin_attempts WHERE ip_hash=? AND at > datetime('now','-15 minutes')").get(ip) as {total:number};
  return row.total>=8;
}
export function recordAdminAttempt(ip:string){const db=database();db.prepare('INSERT INTO admin_attempts(ip_hash) VALUES(?)').run(ip);db.prepare("DELETE FROM admin_attempts WHERE at < datetime('now','-1 day')").run();}

export function listPortfolio(publicOnly=false):PortfolioEntry[]{
  return database().prepare(`SELECT * FROM portfolio_entries ${publicOnly?'WHERE published=1':''} ORDER BY created_at DESC LIMIT 100`).all() as PortfolioEntry[];
}
export function getPortfolioEntry(id:string):PortfolioEntry|undefined{
  return database().prepare('SELECT * FROM portfolio_entries WHERE id=?').get(id) as PortfolioEntry|undefined;
}
export function createPortfolioEntry(data:{title:string;category:string;summary:string;filename:string;mime:string;videoUrl:string|null;consent:boolean}){
  const id=randomUUID();
  database().prepare('INSERT INTO portfolio_entries(id,title,category,summary,image_filename,image_mime,video_url,consent_confirmed) VALUES(?,?,?,?,?,?,?,?)')
    .run(id,data.title,data.category,data.summary,data.filename,data.mime,data.videoUrl,data.consent?1:0);
  return id;
}
export function setPortfolioPublished(id:string,published:boolean){
  if(published){return database().prepare('UPDATE portfolio_entries SET published=1 WHERE id=? AND consent_confirmed=1').run(id).changes===1;}
  return database().prepare('UPDATE portfolio_entries SET published=0 WHERE id=?').run(id).changes===1;
}
