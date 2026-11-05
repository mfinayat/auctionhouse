import {getPlatformProxy} from 'wrangler';
import {registerHooks} from 'node:module';
import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';

const proxy=await getPlatformProxy({configPath:'dist/server/wrangler.json',persist:false});
globalThis.__AH_DEAL_TEST_ENV={DB:proxy.env.DB,ADMIN_ACCOUNT_IDS:'operator'};
registerHooks({
  resolve(specifier,context,next){
    if(specifier==='cloudflare:workers')return {url:'data:text/javascript,export const env=globalThis.__AH_DEAL_TEST_ENV;',shortCircuit:true};
    if(specifier.startsWith('.')&&context.parentURL?.includes('/app/')){
      const url=new URL(specifier,context.parentURL);
      if(!path.extname(url.pathname)&&fs.existsSync(fileURLToPath(url)+'.ts'))return {url:url.href+'.ts',shortCircuit:true};
    }
    return next(specifier,context);
  },
  load(url,context,next){
    if(url.endsWith('.ts')&&url.includes('/app/'))return {format:'module',shortCircuit:true,source:ts.transpileModule(fs.readFileSync(fileURLToPath(url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText};
    return next(url,context);
  },
});
try {
  const DB=proxy.env.DB;
  for(const file of fs.readdirSync('drizzle').filter(file=>file.endsWith('.sql')).sort()){
    for(const sql of fs.readFileSync('drizzle/'+file,'utf8').split('--> statement-breakpoint').map(sql=>sql.trim()).filter(Boolean))await DB.prepare(sql).run();
  }
  const {GET,POST}=await import('../app/api/[...path]/route.ts');
  const {digest,publicAccount}=await import('../app/lib/accounts.ts');
  const {money,fee,partyBalance,settlement}=await import('../app/lib/fees.ts');
  assert.equal(money('123.45'),12345);assert.equal(fee(10100,50),51);
  assert.throws(()=>money('1e6'));assert.throws(()=>money('0.001'));assert.throws(()=>fee(10000,201));
  assert.deepEqual(partyBalance(10000000,50,60000,0),{serviceCharge:50000,depositCredit:50000,servicePaid:0,remaining:0,refundable:10000});
  const cookies={};
  for(const id of ['operator','buyer','seller','outsider']){
    await DB.prepare('INSERT INTO accounts (id,email,full_name,profile_complete,created_at,updated_at) VALUES (?,?,?,1,?,?)').bind(id,id+'@example.test',id,Date.now(),Date.now()).run();
    const token=({operator:'a',buyer:'b',seller:'c',outsider:'d'})[id].repeat(64);cookies[id]='ah_session='+token;
    await DB.prepare('INSERT INTO account_sessions (token_hash,account_id,expires_at) VALUES (?,?,?)').bind(await digest(token),id,Date.now()+600000).run();
  }
  assert.equal(publicAccount({id:'operator'}).isAdmin,true);assert.equal(publicAccount({id:'buyer',isAdmin:true}).isAdmin,false);
  const origin='https://test.example';
  async function call(actor,url,data,overrideHeaders={}){
    const request=new Request(origin+url,{method:data===undefined?'GET':'POST',headers:{Origin:origin,...(actor?{Cookie:cookies[actor]}:{}),...(data===undefined?{}:{'Content-Type':'application/json'}),...overrideHeaders},body:data===undefined?undefined:JSON.stringify(data)});
    const response=await (data===undefined?GET(request):POST(request));return {status:response.status,body:await response.json()};
  }
  async function expect(actor,url,data,status=200){const r=await call(actor,url,data);assert.equal(r.status,status,JSON.stringify(r.body));return r.body;}
  await expect(null,'/api/admin/overview',undefined,401);
  await expect('buyer','/api/admin/overview',undefined,403);
  const overview=await expect('operator','/api/admin/overview');assert.equal(overview.accounts.length,4);assert(!JSON.stringify(overview).includes('password_hash'));
  const draft={title:'Synthetic Pine Executive deal',buyerId:'buyer',sellerId:'seller',salePrice:'100000.00',buyerRateBps:50,sellerRateBps:100,buyerDeposit:'200.00',sellerDeposit:'1200.00',terms:'Synthetic test agreement. Participation is credited to service charges on completion.'};
  await expect('buyer','/api/admin/deals',draft,403);
  await expect('operator','/api/admin/deals',{...draft,sellerId:'buyer'},400);
  await expect('operator','/api/admin/deals',{...draft,buyerRateBps:201},400);
  assert.equal((await call('operator','/api/admin/deals',draft,{Origin:'https://attacker.test'})).status,400);
  const {id}=await expect('operator','/api/admin/deals',draft,201);
  await expect('outsider','/api/deals/'+id,undefined,404);
  await expect('operator','/api/admin/deals/'+id+'/activate',{reason:'Activate before payments'},409);
  const receipt={party:'buyer',purpose:'participation',method:'cash',amount:'200.00',reference:'AH-test-buyer'};
  await expect('operator','/api/admin/deals/'+id+'/payments',receipt,409);
  await expect('buyer','/api/deals/'+id+'/accept',{confirm:true});
  await expect('seller','/api/deals/'+id+'/accept',{confirm:true});
  await expect('buyer','/api/admin/deals/'+id+'/payments',receipt,403);
  await expect('operator','/api/admin/deals/'+id+'/payments',{...receipt,method:'card'},400);
  await expect('operator','/api/admin/deals/'+id+'/payments',{...receipt,amount:'201.00'},409);
  const first=await expect('operator','/api/admin/deals/'+id+'/payments',receipt,201);
  const repeated=await expect('operator','/api/admin/deals/'+id+'/payments',receipt);assert.equal(repeated.id,first.id);
  await expect('operator','/api/admin/deals/'+id+'/payments',{...receipt,reference:'AH-extra',amount:'0.01'},409);
  await expect('operator','/api/admin/deals/'+id+'/void',{paymentId:first.id,reason:'Synthetic receipt correction'});
  await expect('operator','/api/admin/deals/'+id+'/payments',{...receipt,reference:'AH-test-buyer-corrected'},201);
  await expect('operator','/api/admin/deals/'+id+'/payments',{...receipt,party:'seller',amount:'1200.00',reference:'AH-test-seller'},201);
  const own=await expect('buyer','/api/deals/'+id);assert(own.payments.every(p=>p.party==='buyer'));assert.equal(own.events.length,0);
  await expect('operator','/api/admin/deals/'+id+'/activate',{reason:'Both deposits verified'});
  await expect('operator','/api/admin/deals/'+id+'/complete',{reason:'Attempt without service balance',confirm:true},409);
  await expect('operator','/api/admin/deals/'+id+'/payments',{...receipt,purpose:'service',amount:'300.01',reference:'AH-service-over'},409);
  await expect('operator','/api/admin/deals/'+id+'/payments',{...receipt,purpose:'service',amount:'300.00',reference:'AH-service-buyer'},201);
  await expect('operator','/api/admin/deals/'+id+'/complete',{reason:'Sale transfer reference synthetic-123',confirm:true});
  const completed=await expect('operator','/api/admin/deals/'+id);assert.equal(completed.deal.status,'completed');assert.equal(completed.balances.buyer.remaining,0);assert.equal(completed.balances.seller.refundable,20000);
  await expect('operator','/api/admin/deals/'+id+'/payments',{...receipt,reference:'AH-closed'},409);
  await expect('operator','/api/admin/deals/'+id+'/void',{paymentId:first.id,reason:'Cannot void completed'},409);
  const held=await expect('operator','/api/admin/deals',draft,201);
  await expect('operator','/api/admin/deals/'+held.id+'/dispute',{reason:'Buyer withdrawal needs evidence review'});
  await expect('operator','/api/admin/deals/'+held.id+'/activate',{reason:'Cannot release disputed deal'},400);
  await expect('operator','/api/admin/deals/'+held.id+'/payments',{...receipt,reference:'AH-held'},409);
  assert.equal((await expect('outsider','/api/deals')).deals.length,0);
  const payout={party:'seller',amount:'200.00',method:'cash',reference:'REFUND-success-1',confirm:true};
  await expect('buyer','/api/admin/deals/'+id+'/payouts',payout,403);
  await expect('operator','/api/admin/deals/'+id+'/payouts',{...payout,amount:'200.01'},409);
  const paidReceipt=await expect('operator','/api/admin/deals/'+id+'/payouts',payout,201);
  const duplicatePayout=await expect('operator','/api/admin/deals/'+id+'/payouts',payout);assert.equal(paidReceipt.id,duplicatePayout.id);
  await expect('operator','/api/admin/deals/'+id+'/payouts',{...payout,reference:'REFUND-over',amount:'0.01'},409);
  for(const outcome of ['default_buyer','default_seller','mutual_cancel']){
    const {id:caseId}=await expect('operator','/api/admin/deals',draft,201);
    await expect('buyer','/api/deals/'+caseId+'/accept',{confirm:true});
    await expect('seller','/api/deals/'+caseId+'/accept',{confirm:true});
    await expect('operator','/api/admin/deals/'+caseId+'/payments',{...receipt,amount:'200.00',reference:'CASE-buyer-'+outcome},201);
    await expect('operator','/api/admin/deals/'+caseId+'/payments',{...receipt,party:'seller',amount:'1200.00',reference:'CASE-seller-'+outcome},201);
    await expect('operator','/api/admin/deals/'+caseId+'/dispute',{reason:'Review documented party cancellation'});
    const decision=await expect('operator','/api/admin/deals/'+caseId+'/resolve',{outcome,reason:'Synthetic evidence reference 2026-001',confirm:true});
    const a=decision.allocation;
    assert.equal(a.buyerRefund+a.sellerRefund+a.buyerCompensation+a.sellerCompensation+a.platformRetained,a.totalReceived);
    if(outcome==='default_buyer'){assert.equal(a.sellerRefund,120000);assert.equal(a.sellerCompensation,10000);assert.equal(a.platformRetained,10000);assert.equal(a.buyerRefund,0);}
    if(outcome==='default_seller'){assert.equal(a.buyerRefund,20000);assert.equal(a.buyerCompensation,60000);assert.equal(a.platformRetained,60000);assert.equal(a.sellerRefund,0);}
    if(outcome==='mutual_cancel'){assert.equal(a.buyerRefund,20000);assert.equal(a.sellerRefund,120000);assert.equal(a.platformRetained,0);}
    await expect('operator','/api/admin/deals/'+caseId+'/resolve',{outcome,reason:'Cannot decide a settled deal twice',confirm:true},400);
  }
  const odd=settlement('default_buyer',100000,50,200,{buyer:{participation:101,service:10},seller:{participation:200,service:20}});
  assert.equal(odd.sellerCompensation,50);assert.equal(odd.platformRetained,51);assert.equal(odd.buyerRefund,10);assert.equal(odd.sellerRefund,220);
  assert.equal(fee(100000,200),2000);
  const concurrent=await expect('operator','/api/admin/deals',{...draft,buyerRateBps:200},201);
  await expect('buyer','/api/deals/'+concurrent.id+'/accept',{confirm:true});
  await expect('seller','/api/deals/'+concurrent.id+'/accept',{confirm:true});
  const simultaneous=await Promise.all(['A','B'].map(suffix=>call('operator','/api/admin/deals/'+concurrent.id+'/payments',{...receipt,amount:'150.00',reference:'CONCURRENT-'+suffix})));
  assert.deepEqual(simultaneous.map(r=>r.status).sort(),[201,409]);
  const concurrentDetail=await expect('operator','/api/admin/deals/'+concurrent.id);
  assert.equal(concurrentDetail.balances.buyer.depositReceived,15000);
  assert.equal(concurrentDetail.events.filter(event=>event.action==='cash_received').length,1);
  await expect('operator','/api/admin/deals/'+concurrent.id+'/dispute',{reason:'Mutual cancellation of concurrency fixture'});
  await expect('operator','/api/admin/deals/'+concurrent.id+'/resolve',{outcome:'mutual_cancel',reason:'Both parties cancelled without fault',confirm:true});
  const payouts=await Promise.all(['A','B'].map(suffix=>call('operator','/api/admin/deals/'+concurrent.id+'/payouts',{party:'buyer',amount:'100.00',method:'bank_transfer',reference:'CONCURRENT-PAYOUT-'+suffix,confirm:true})));
  assert.deepEqual(payouts.map(r=>r.status).sort(),[201,409]);
  const afterPayouts=await expect('operator','/api/admin/deals/'+concurrent.id);assert.equal(afterPayouts.paid.buyer,10000);
  await assert.rejects(DB.prepare('DELETE FROM deal_payments WHERE id=?').bind(first.id).run());
  await assert.rejects(DB.prepare("UPDATE deal_settlements SET platform_retained=0 WHERE deal_id=?").bind(id).run());
  console.log('PASS: all default/cancellation allocations conserve funds, concurrent receipt/payout caps and audit rollback, idempotency, final-settlement immutability, 2% rate and odd-paisa rounding.');
  console.log('PASS: money rounding, administrator authorization, CSRF rejection, deal isolation, consent, receipt idempotency/voiding, overpayment limits, service credit, excess liability, completion guards and dispute holds.');
}finally{await proxy.dispose();delete globalThis.__AH_DEAL_TEST_ENV;}
