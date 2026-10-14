/** PrimeCuts Operations — server-side role matrix; never authorize a client-provided role. */
export const staffRoles=['owner','administrator','secretary','producer','casting_manager','editor','photographer','crew','finance'] as const;
export type StaffRole=(typeof staffRoles)[number];
export const capabilities=[
 'people.manage','roles.manage','crm.read','crm.write','projects.read','projects.write','projects.create','finance.read','finance.write',
 'casting.read','casting.write','casting.review','production.read','production.write',
 'assets.read','assets.write','assets.publish','contracts.read','contracts.write',
 'inventory.read','inventory.write','tasks.read','tasks.write','audit.read'
] as const;
export type Capability=(typeof capabilities)[number];
const grants:Record<StaffRole,readonly Capability[]>={
 owner:capabilities,
 administrator:capabilities.filter(p=>p!=='roles.manage'),
 secretary:['crm.read','crm.write','projects.read','projects.write','projects.create','casting.read','production.read','production.write','contracts.read','tasks.read','tasks.write'],
 producer:['crm.read','projects.read','projects.write','projects.create','finance.read','casting.read','casting.write','casting.review','production.read','production.write','assets.read','assets.write','assets.publish','contracts.read','contracts.write','inventory.read','inventory.write','tasks.read','tasks.write'],
 casting_manager:['projects.read','casting.read','casting.write','casting.review','production.read','assets.read','tasks.read','tasks.write'],
 editor:['projects.read','production.read','assets.read','assets.write','tasks.read','tasks.write'],
 photographer:['projects.read','production.read','assets.read','assets.write','inventory.read','tasks.read','tasks.write'],
 crew:['projects.read','production.read','inventory.read','tasks.read','tasks.write'],
 finance:['crm.read','projects.read','finance.read','finance.write','contracts.read','tasks.read','tasks.write']
};
export function roleCan(role:StaffRole,ability:Capability){return grants[role].includes(ability);}
export function staffRoleValid(s:string):s is StaffRole{return (staffRoles as readonly string[]).includes(s);}
export type Scope={role:StaffRole,active:boolean,assignedProjectIds:readonly string[]};
export function scopeCan(s:Scope,capability:Capability,projectId?:string){
 if(!s.active||!roleCan(s.role,capability))return false;
 if(!projectId)return s.role==='owner'||s.role==='administrator'||capability==='crm.read'||capability==='crm.write'||capability==='tasks.read';
 return s.role==='owner'||s.role==='administrator'||s.assignedProjectIds.includes(projectId);
}
// To enforce: derive Scope from server-authenticated account & pc_staff_members,
// then reject unauthorized actions BEFORE any service-role database call.
