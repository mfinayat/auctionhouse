import fs from 'node:fs';
import path from 'node:path';
import {Script} from 'node:vm';
import {createHash} from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..'),publicDir=path.join(root,'public'),assets={};
for(const [key,files]of Object.entries({siteJS:['auctions.js','marketplace-v3.js','app.js','nov8.js','property-pages.js','nov9.js'],siteCSS:['style.css','management.css','auctions.css','v3.css','nov8.css','nov9.css'],staffJS:['staff.js','staff-nov8.js','staff-nov9.js'],staffCSS:['staff.css','nov8.css','nov9.css']})){const ext=key.endsWith('JS')?'js':'css',text=files.map(file=>fs.readFileSync(path.join(publicDir,file),'utf8')).join(ext==='js'?'\n;\n':'\n'),hash=createHash('sha256').update(text).digest('hex').slice(0,16),name=`bundle-${key}-${hash}.${ext}`;if(ext==='js')new Script(text,{filename:name});fs.writeFileSync(path.join(publicDir,name),text);assets[key]='/'+name}
// Remove only obsolete generated bundles in this repository's public directory.
for(const file of fs.readdirSync(publicDir))if(/^bundle-(site|staff)(JS|CSS)-[a-f0-9]{16}\.(js|css)$/.test(file)&&!Object.values(assets).includes('/'+file))fs.unlinkSync(path.join(publicDir,file));
fs.writeFileSync(path.join(root,'app/asset-manifest.ts'),'export const assets='+JSON.stringify(assets)+';\n');
// Keep public financial/privacy wording identical with and without JavaScript.
const app=fs.readFileSync(path.join(publicDir,'app.js'),'utf8'),policies={};
for(const name of ['fees','privacy']){const match=app.match(new RegExp('function '+name+'Page\\(\\)\\{[^\\n]*?\\+`([^`]+)`\\}'));if(!match)throw new Error('Unable to extract '+name+' public policy');policies[name]=match[1].replace(/^<section class="section">/,'').replace(/<\/section>$/,'')}
fs.writeFileSync(path.join(root,'app/policy-content.ts'),'export const policies='+JSON.stringify(policies)+';\n');
const flow=fs.readFileSync(path.join(publicDir,'nov8.js'),'utf8').match(/function ballotFlow\(\)\{return `([^`]+)`\}/);if(!flow)throw new Error('Ballot flow content is missing');fs.writeFileSync(path.join(root,'app/ballot-flow.ts'),'export const ballotFlow='+JSON.stringify(flow[1].replace('${LDA}','https://lda.gop.pk/sales-landing'))+';\n');
console.log('Generated versioned CSS and JavaScript bundles.');
