// Create a one-way password hash without writing the password to project files.
// Recommended: read -rsp "Admin password: " PW; echo; printf "%s" "$PW" | node scripts/generate-admin-hash.cjs; unset PW
const fs=require('node:fs');const {randomBytes,scryptSync}=require('node:crypto');
const pw=fs.readFileSync(0,'utf8').replace(/\r?\n$/,'');
if(pw.length<12){console.error('Provide a password of at least 12 characters via standard input.');process.exit(1);}
const salt=randomBytes(24);console.log('scrypt$'+salt.toString('base64url')+'$'+scryptSync(pw,salt,64).toString('base64url'));
