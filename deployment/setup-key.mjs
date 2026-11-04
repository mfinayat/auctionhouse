import {spawnSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
const here=fileURLToPath(new URL('.',import.meta.url)),require=createRequire(import.meta.url);
const wrangler=path.join(path.dirname(require.resolve('wrangler/package.json')),'bin/wrangler.js');
const config=path.join(here,'wrangler.json');
const base=['--config',config];
const first=spawnSync(process.execPath,[wrangler,'secret','list',...base],{cwd:here,encoding:'utf8',env:process.env});
if(first.status!==0){process.stderr.write(first.stderr||first.stdout||'Could not check existing secrets. Run npm run login first.\n');process.exit(first.status||1)}
if(/"name"\s*:\s*"PII_ENCRYPTION_KEY"/.test(first.stdout)){console.log('The encryption key is already configured. It has been preserved.');process.exit(0)}
// The random key goes directly to Wrangler over stdin: not arguments, logs or files.
const secret=randomBytes(32).toString('base64');
const put=spawnSync(process.execPath,[wrangler,'secret','put','PII_ENCRYPTION_KEY',...base],{cwd:here,input:secret+'\n',encoding:'utf8',env:process.env});
if(put.status!==0){process.stderr.write(put.stderr||put.stdout||'Could not configure the encryption key.\n');process.exit(put.status||1)}
console.log('Encryption key configured securely. Keep this Worker secret in place when updating the website.');
