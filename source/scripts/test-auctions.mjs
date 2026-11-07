import {getPlatformProxy} from 'wrangler';
import {registerHooks} from 'node:module';
import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes} from 'node:crypto';
import assert from 'node:assert/strict';
const proxy=await getPlatformProxy({configPath:'dist/server/wrangler.json',persist:false});
globalThis.__AH_AUCTION_TEST_ENV={DB:proxy.env.DB,ADMIN_ACCOUNT_IDS:'operator',PII_ENCRYPTION_KEY:randomBytes(32).toString('base64')};
registerHooks({resolve(specifier,context,next){if(specifier==='cloudflare:workers')return{url:'data:text/javascript,export const env=globalThis.__AH_AUCTION_TEST_ENV;',shortCircuit:true};if(specifier.startsWith('.')&&context.parentURL?.includes('/app/')){const u=new URL(specifier,context.parentURL);if(!path.extname(u.pathname)&&fs.existsSync(fileURLToPath(u)+'.ts'))return{url:u.href+'.ts',shortCircuit:true}}return next(specifier,context)},load(url,context,next){if(url.endsWith('.ts')&&url.includes('/app/'))return{format:'module',shortCircuit:true,source:ts.transpileModule(fs.readFileSync(fileURLToPath(url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText};return next(url,context)}});
try{
 const DB=proxy.env.DB;for(const f of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())for(const sql of fs.readFileSync('drizzle/'+f,'utf8').split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean))await DB.prepare(sql).run();
 const {GET,POST}=await import('../app/api/[...path]/route.ts'),{digest}=await import('../app/lib/accounts.ts'),{safeReturn}=await import('../app/lib/validation.ts');
 const cookies={};for(const [i,id] of ['operator','seller','buyer','other','google','delete-me'].entries()){await DB.prepare('INSERT INTO accounts (id,email,full_name,profile_complete,google_sub,created_at,updated_at) VALUES (?,?,?, ?,?,?,?)').bind(id,id+'@example.test',id,id==='google'?0:1,id==='google'?'test-google-sub':null,Date.now(),Date.now()).run();const token=String(i+1).repeat(64);cookies[id]='ah_session='+token;await DB.prepare('INSERT INTO account_sessions (token_hash,account_id,expires_at) VALUES (?,?,?)').bind(await digest(token),id,Date.now()+7*86400000).run()}
 async function call(actor,url,data,origin='https://test.example'){const req=new Request('https://test.example'+url,{method:data===undefined?'GET':'POST',headers:{Origin:origin,...(actor?{Cookie:cookies[actor]}:{}),...(data===undefined?{}:{'Content-Type':'application/json'})},body:data===undefined?undefined:JSON.stringify(data)}),res=await(data===undefined?GET(req):POST(req));return {...await res.json(),httpStatus:res.status}}
 const ok=(r,status=200)=>assert.equal(r.httpStatus,status,JSON.stringify(r));
 const accept=(actor,id,kind='auction')=>call(actor,'/api/listings/'+id+'/accept-terms',{kind,agree:true,version:1});
 let r=await call(null,'/api/listings');ok(r);assert.equal(r.listings.length,2);assert.equal(r.listings[0].starting_price,20000000);assert.equal(r.listings[0].unit_mode,'lump sum');assert(!JSON.stringify(r).includes('seller_id'));
 ok(await call(null,'/api/listings/AH-DEMO-1001/bid',{amount:22000000,version:0}),401);
 ok(await call('buyer','/api/listings/AH-DEMO-1001/bid',{amount:22000000,version:0}),403);
 r=await accept('buyer','AH-DEMO-1001');ok(r);const bidder=r.bidderCode;assert.match(bidder,/^1001-[A-Z]{4}$/);assert.equal((await accept('buyer','AH-DEMO-1001')).bidderCode,bidder);
 ok(await accept('other','AH-DEMO-1001'));
 ok(await call('buyer','/api/listings/AH-DEMO-1001/bid',{amount:21000000,version:0}),409);
 const race=await Promise.all(['buyer','other'].map(actor=>call(actor,'/api/listings/AH-DEMO-1001/bid',{amount:22000000,version:0})));assert.deepEqual(race.map(r=>r.httpStatus).sort(),[201,409]);
 r=await call('buyer','/api/listings/AH-DEMO-1001');assert.equal(r.bids.length,1);assert.equal(r.listing.current_price,22000000);assert.match(r.bids[0].bidder_code,/^1001-[A-Z]{4}$/);assert(!JSON.stringify(r.bids).includes('account_id'));
 ok(await call('buyer','/api/listings/AH-DEMO-1001/bid',{amount:24000000,version:1}),201);
 r=await call('buyer','/api/listings/AH-DEMO-1001');assert.equal(r.bids[0].amount,24000000);assert.equal(r.bids[0].bidder_code,bidder);assert.equal(r.negotiationAvailable,false);
 ok(await call('buyer','/api/listings/AH-DEMO-1001/favorite',{favorite:true}));ok(await call('buyer','/api/listings/AH-DEMO-1001/favorite',{favorite:true}));r=await call('buyer','/api/my-marketplace');assert.equal(r.favorites.length,1);assert.equal(r.bids.length,1);assert.equal((await call('other','/api/my-marketplace')).favorites.length,0);
 const payload={project:'axis',category:'8 Marla · Pine Avenue',title:'Synthetic Pine Axis file',address:'Test Pine Avenue, Lahore',marla:8,allotment:'Plot Allotted',block:'Block-A (Pine Avenue)',plot:'C-26',image:'/assets/pine-axis.webp',unitMode:'lump sum',price:200000,interval1:20000,interval2:40000,interval3:60000,negotiationInterval:20000,negotiationMinutes:60,holdingHours:0,startsAt:Date.now()-1000,endsAt:Date.now()+86400000,facts:'First synthetic fact.\nSecond synthetic fact.',terms:'First synthetic term.\nSecond synthetic term.',negotiationTerms:'Private descending negotiation.\nResponse within the stated window.'};
 ok(await call('seller','/api/listings',{...payload,plot:'C-999'}),400);ok(await call('seller','/api/listings',{...payload,interval2:100}),400);ok(await call('seller','/api/listings',{...payload,image:'javascript:alert(1)'}),400);
 r=await call('seller','/api/listings',payload);ok(r,201);const id=r.id;assert.match(id,/\d{4}$/);ok(await call(null,'/api/listings/'+id),404);ok(await call('buyer','/api/listing-review'),403);ok(await call('buyer','/api/listing-review',{id,status:'active'}),403);ok(await call('operator','/api/listing-review',{id,status:'active'}));
 ok(await accept('seller',id),403);ok(await accept('buyer',id));ok(await accept('other',id));
 r=await call('buyer','/api/listings/'+id+'/request-negotiation',{});ok(r,201);const n=r.id;ok(await call('buyer','/api/listings/'+id+'/request-negotiation',{}),409);
 ok(await call('other','/api/negotiations/'+n),403);ok(await call('buyer','/api/negotiations/'+n+'/approve',{version:0}),403);
 r=await call('seller','/api/listings/'+id);assert.equal(r.negotiations[0].id,n);assert.match(r.negotiations[0].bidder_code,new RegExp(id.slice(-4)+'-[A-Z]{4}'));
 ok(await call('seller','/api/negotiations/'+n+'/approve',{version:0}));ok(await call('other','/api/listings/'+id+'/bid',{version:1,amount:22000000}),409);
 ok(await call('buyer','/api/negotiations/'+n+'/offer',{version:1,amount:18000000}),403);ok(await accept('buyer',id,'negotiation'));
 ok(await call('buyer','/api/negotiations/'+n+'/offer',{version:1,amount:17000000}),400);ok(await call('buyer','/api/negotiations/'+n+'/offer',{version:1,amount:18000000}));
 const counters=await Promise.all([call('seller','/api/negotiations/'+n+'/counter',{version:2}),call('seller','/api/negotiations/'+n+'/agree',{version:2})]);assert.deepEqual(counters.map(r=>r.httpStatus).sort(),[200,409]);
 r=await call('buyer','/api/negotiations/'+n);assert.equal(r.history.length,3);if(r.negotiation.status==='buyer_turn')ok(await call('buyer','/api/negotiations/'+n+'/agree',{version:3}));
 assert.equal((await call(null,'/api/listings/'+id)).listing.status,'agreed');ok(await call('buyer','/api/listings/'+id+'/bid',{version:4,amount:22000000}),409);
 // Holding periods and expiration are enforced on the server.
 r=await call('seller','/api/listings',{...payload,title:'Holding period fixture',holdingHours:1,endsAt:Date.now()+172800000});ok(r,201);const hold=r.id;ok(await call('operator','/api/listing-review',{id:hold,status:'active'}));ok(await accept('buyer',hold));ok(await call('buyer','/api/listings/'+hold+'/request-negotiation',{}),409);
 await DB.prepare('UPDATE listings SET starts_at=starts_at-7200000 WHERE id=?').bind(hold).run();r=await call('buyer','/api/listings/'+hold+'/request-negotiation',{});ok(r,201);const exp=r.id;ok(await call('seller','/api/negotiations/'+exp+'/approve',{version:0}));await DB.prepare('UPDATE negotiations SET deadline=? WHERE id=?').bind(Date.now()-1,exp).run();assert.equal((await call('buyer','/api/negotiations/'+exp)).negotiation.status,'expired');ok(await accept('buyer',hold,'negotiation'));ok(await call('buyer','/api/negotiations/'+exp+'/offer',{version:2,amount:18000000}),409);
 ok(await call('buyer','/api/listings/'+hold+'/withdraw',{}),403);ok(await call('seller','/api/listings/'+hold+'/withdraw',{}));assert.equal((await call('seller','/api/listings/'+hold)).listing.status,'withdrawn');ok(await call(null,'/api/listings/'+hold),404);ok(await call('seller','/api/listings/'+id+'/withdraw',{}),409);
 // CSRF, immutable identity, Google profile completion and deletion.
 ok(await call('buyer','/api/listings/AH-DEMO-1001/favorite',{favorite:false},'https://attacker.example'),400);
 const profile={fullName:'Google Account',fatherName:'Test Parent',email:'google@example.test',cnic:'3520200000077',countryCode:'+92',mobile:'3001234567',address:'Test street, Lahore, Pakistan'};
 r=await call('google','/api/auth/profile',profile);ok(r);assert.equal(r.user.hasPassword,false);assert.equal(r.user.profileComplete,true);ok(await call('google','/api/auth/profile',{...profile,cnic:'3520200000088'}),400);
 r=await call('google','/api/auth/settings',{fullName:'New Name',countryCode:'+92',mobile:'3001234567',email:'changed@example.test',cnic:'3520200000088'});ok(r);assert.equal(r.user.email,'google@example.test');
 const fp=await DB.prepare('SELECT cnic_fingerprint FROM accounts WHERE id=?').bind('google').first();assert(fp.cnic_fingerprint);
 ok(await call('buyer','/api/auth/delete',{confirm:'DELETE'}),400);ok(await call('delete-me','/api/auth/delete',{confirm:'DELETE'}));const deleted=await DB.prepare('SELECT * FROM accounts WHERE id=?').bind('delete-me').first();assert.equal(deleted.full_name,'Deleted account');assert.equal(deleted.cnic_encrypted,null);assert.equal((await call('delete-me','/api/auth/me')).user,null);
 for(const bad of ['https://attacker.example','//attacker.example','/\\attacker.example','/#/account','/api/auth/logout','/listing/a\nLocation: bad'])assert.equal(safeReturn(bad),'/account');assert.equal(safeReturn('/listing/AH-DEMO-1001'),'/listing/AH-DEMO-1001');
 console.log('PASS: catalogue and plot validation, moderated listings, anonymous bidding IDs, terms gates, concurrent bids and seller responses, chronological history, favourites and account isolation, private descending negotiation, holding and response deadlines, CSRF, Google completion without a password, immutable identity and permanent profile deletion.');
}finally{await proxy.dispose();delete globalThis.__AH_AUCTION_TEST_ENV}
