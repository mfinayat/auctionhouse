import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const sourceRoot=fileURLToPath(new URL('../',import.meta.url)),out=path.resolve(sourceRoot,'../deployment');
const config=JSON.parse(fs.readFileSync(path.join(sourceRoot,'wrangler.jsonc'),'utf8'));
for(const part of ['server','client']){const dest=path.join(out,part);fs.rmSync(dest,{recursive:true,force:true});fs.cpSync(path.join(sourceRoot,'dist',part),dest,{recursive:true})}
fs.rmSync(path.join(out,'server/wrangler.json'),{force:true});
fs.rmSync(path.join(out,'migrations'),{recursive:true,force:true});fs.mkdirSync(path.join(out,'migrations'),{recursive:true});
for(const name of fs.readdirSync(path.join(sourceRoot,'drizzle')))if(name.endsWith('.sql'))fs.copyFileSync(path.join(sourceRoot,'drizzle',name),path.join(out,'migrations',name));
const deployment={...config,main:'server/index.js',no_bundle:true,rules:[{type:'ESModule',globs:['**/*.js','**/*.mjs']}],assets:{directory:'client'},d1_databases:config.d1_databases.map(d=>({...d,migrations_dir:'migrations'}))};
fs.writeFileSync(path.join(out,'wrangler.json'),JSON.stringify(deployment,null,2)+'\n');
console.log('Ready-built deployment refreshed in ../deployment.');
