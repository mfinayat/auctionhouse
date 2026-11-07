import {db,currentAccount,rateLimit} from './accounts';
import {isAdmin} from './admin-access';
import {inventory} from './inventory';

class Failure extends Error {constructor(message:string,public status=400){super(message)}}
const json=(value:any,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
const fail=(message:string,status=400):never=>{throw new Failure(message,status)};
function text(v:any,label:string,min=2,max=300):string{if(typeof v!=='string'||v.trim().length<min||v.trim().length>max)fail(`Enter ${label} (${min}–${max} characters).`);return v.trim()}
function integer(v:any,label:string,min=1,max=1000000000000){if(!Number.isSafeInteger(v)||v<min||v>max)fail(`Enter a valid ${label}.`);return v as number}
function lines(v:any,label:string){const list=text(v,label,10,5000).split(/\r?\n/).map(s=>s.trim()).filter(Boolean);if(list.length>60)fail(`Use up to 60 lines for ${label}.`);return JSON.stringify(list)}
async function listing(id:string){const row=await db().prepare('SELECT * FROM listings WHERE id=?').bind(id).first<any>();if(!row)fail('Listing not found.',404);return row}
async function member(req:Request){const a=await currentAccount(req);if(!a)fail('Log in to continue.',401);if(!a.profile_complete)fail('Complete your account details to continue.',403);return a}
const active=(l:any)=>{if(l.status!=='active'||l.starts_at>Date.now()||l.ends_at<=Date.now())fail('This listing is not open for bidding.',409)};
async function bidder(l:any,a:any){if(l.seller_id===a.id)fail('You cannot bid or negotiate on your own listing.',403);let row=await db().prepare('SELECT * FROM listing_bidders WHERE listing_id=? AND account_id=?').bind(l.id,a.id).first<any>();if(row)return row;for(let i=0;i<8;i++){const bytes=crypto.getRandomValues(new Uint8Array(4)),code=l.id.slice(-4)+'-'+Array.from(bytes,b=>String.fromCharCode(65+b%26)).join('');try{await db().prepare('INSERT INTO listing_bidders (listing_id,account_id,bidder_code) VALUES (?,?,?) ON CONFLICT(listing_id,account_id) DO NOTHING').bind(l.id,a.id,code).run();return await db().prepare('SELECT * FROM listing_bidders WHERE listing_id=? AND account_id=?').bind(l.id,a.id).first<any>()}catch(e){if(!String(e).includes('UNIQUE'))throw e}}return fail('Please retry to assign your bidding ID.',409)}
async function expired(id:string){await db().prepare("UPDATE negotiations SET status='expired',version=version+1 WHERE listing_id=? AND status IN ('approved','seller_turn','buyer_turn') AND deadline<=?").bind(id,Date.now()).run()}
async function liveNegotiation(id:string){await expired(id);return db().prepare("SELECT * FROM negotiations WHERE listing_id=? AND status IN ('approved','seller_turn','buyer_turn')").bind(id).first<any>()}
async function accepted(l:any,a:any,kind:string){if(!await db().prepare('SELECT listing_id FROM listing_acceptances WHERE listing_id=? AND account_id=? AND kind=? AND terms_version=?').bind(l.id,a.id,kind,l.terms_version).first())fail('Read and accept the current terms before continuing.',403)}
function publicListing(l:any){const {seller_id,...safe}=l;return {...safe,facts:JSON.parse(l.facts),terms:JSON.parse(l.terms),negotiation_terms:JSON.parse(l.negotiation_terms)}}

export async function auctionRequest(req:Request,data?:any){try{
 const url=new URL(req.url),parts=url.pathname.split('/').filter(Boolean),id=parts[2],action=parts[3];
 if(req.method==='GET'&&url.pathname==='/api/catalogue')return json({inventory});
 if(url.pathname==='/api/my-marketplace'){
  const a=await member(req);const [bids,favorites,own]=await Promise.all([
   db().prepare("SELECT DISTINCT l.* FROM listings l JOIN bids b ON b.listing_id=l.id WHERE b.account_id=? AND l.status='active' AND l.ends_at>? ORDER BY l.created_at DESC").bind(a.id,Date.now()).all<any>(),
   db().prepare("SELECT l.* FROM listings l JOIN listing_favorites f ON f.listing_id=l.id WHERE f.account_id=? AND l.status='active' AND l.ends_at>? ORDER BY f.created_at DESC").bind(a.id,Date.now()).all<any>(),
   db().prepare('SELECT * FROM listings WHERE seller_id=? ORDER BY created_at DESC').bind(a.id).all<any>()]);
  return json({bids:bids.results.map(publicListing),favorites:favorites.results.map(publicListing),listings:own.results.map(publicListing)});
 }
 if(url.pathname==='/api/listings'&&req.method==='GET'){
  const rows=await db().prepare("SELECT * FROM listings WHERE status='active' AND ends_at>? ORDER BY is_demo,created_at DESC").bind(Date.now()).all<any>();return json({listings:rows.results.map(publicListing)});
 }
 if(url.pathname==='/api/listing-review'){
  const a=await member(req);if(!isAdmin(a))fail('Administrator access is required.',403);
  if(req.method==='GET'){const rows=await db().prepare("SELECT * FROM listings WHERE status='pending' ORDER BY created_at").all<any>();return json({listings:rows.results.map(publicListing)})}
  const l=await listing(data.id);if(!['active','rejected'].includes(data.status))fail('Choose approve or reject.');if(data.status==='active'&&l.ends_at<=Date.now())fail('This listing has expired.');
  const r=await db().prepare("UPDATE listings SET status=?,version=version+1 WHERE id=? AND status='pending'").bind(data.status,l.id).run();if(!r.meta.changes)fail('The listing was already reviewed.',409);return json({ok:true});
 }
 if(url.pathname==='/api/listings'&&req.method==='POST'){
  const a=await member(req);await rateLimit(req,'create-listing',20);const project=data.project;
  if(!['axis','executive','custom'].includes(project))fail('Choose a project or your own listing.');
  let marla=integer(data.marla,'area in Marla',1,100000),category=text(data.category,'category'),block='',plot='';
  if(!['File is Allotted, Waiting for Plot Allotment','Plot Allotted'].includes(data.allotment))fail('Choose an allotment status.');
  if(project!=='custom'){const entry=inventory[project as keyof typeof inventory].find(e=>e.category===category);if(!entry)throw new Failure('Choose a valid category.');marla=entry.marla;if(data.allotment==='Plot Allotted'){block=text(data.block,'block');plot=text(data.plot,'plot number',1,30);if(!(entry.blocks as Record<string,string[]>)[block]?.includes(plot))fail('Choose a plot from the selected project and block.')}}else if(data.allotment==='Plot Allotted'){block=text(data.block,'block');plot=text(data.plot,'plot number',1,30)}
  if(!['lump sum','per Kanal','per Marla','per Sq Ft'].includes(data.unitMode))fail('Choose a price unit.');
  const price=integer(data.price,'starting price'),intervals=[data.interval1,data.interval2,data.interval3].map(v=>integer(v,'bid interval'));
  if(!(intervals[0]<intervals[1]&&intervals[1]<intervals[2]))fail('Bid intervals must increase from 1 to 3.');
  const now=Date.now(),starts=integer(data.startsAt,'start date',now-60000,now+365*86400000),ends=integer(data.endsAt,'end date',starts+3600000,starts+180*86400000);
  const hold=integer(data.holdingHours,'holding period in hours',0,24*180)*3600000,negTime=integer(data.negotiationMinutes,'negotiation response time',1,10080)*60000;if(hold>=ends-starts)fail('The holding period must end before bidding closes.');
  let image=text(data.image,'image URL',1,2000);if(!/^\/assets\/[\w.-]+$/.test(image)){let u;try{u=new URL(image)}catch{fail('Enter an HTTPS image URL.')}if(u!.protocol!=='https:')fail('Enter an HTTPS image URL.');image=u!.href}
  const newId='AH-'+crypto.randomUUID()+'-'+String(crypto.getRandomValues(new Uint32Array(1))[0]%10000).padStart(4,'0');
  await db().prepare(`INSERT INTO listings (id,seller_id,project,title,address,marla,category,allotment,block,plot,image,unit_mode,starting_price,current_price,interval1,interval2,interval3,negotiation_interval,negotiation_time,holding_period,starts_at,ends_at,facts,terms,negotiation_terms,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(newId,a.id,project,text(data.title,'listing title',5,160),text(data.address,'property address',10,600),marla,category,data.allotment,block,plot,image,data.unitMode,price*100,price*100,...intervals.map(n=>n*100),integer(data.negotiationInterval,'negotiation interval')*100,negTime,hold,starts,ends,lines(data.facts,'facts'),lines(data.terms,'terms and conditions'),lines(data.negotiationTerms,'negotiation terms'),now).run();return json({id:newId,status:'pending'},201);
 }
 if(parts[1]==='negotiations')return await negotiationRequest(req,id,action,data);
 if(parts[1]!=='listings'||!id)fail('Not found.',404);
 const l=await listing(id),a=await currentAccount(req);
 if(l.status!=='active'&&l.status!=='agreed'&&a?.id!==l.seller_id&&!isAdmin(a))fail('Listing not found.',404);
 if(req.method==='GET'){
  await expired(id);const [bids,fav,me,negotiations]=await Promise.all([
   db().prepare('SELECT b.amount,b.created_at,b.version,p.bidder_code FROM bids b JOIN listing_bidders p ON p.listing_id=b.listing_id AND p.account_id=b.account_id WHERE b.listing_id=? ORDER BY b.version DESC LIMIT 500').bind(id).all(),
   a?db().prepare('SELECT listing_id FROM listing_favorites WHERE listing_id=? AND account_id=?').bind(id,a.id).first():null,
   a?db().prepare('SELECT bidder_code FROM listing_bidders WHERE listing_id=? AND account_id=?').bind(id,a.id).first():null,
   a?db().prepare('SELECT n.id,n.status,n.amount,n.deadline,n.version,n.bidder_id,p.bidder_code FROM negotiations n JOIN listing_bidders p ON p.listing_id=n.listing_id AND p.account_id=n.bidder_id WHERE n.listing_id=? AND (n.bidder_id=? OR ?=?) ORDER BY n.created_at DESC').bind(id,a.id,a.id,l.seller_id).all():null]);
  return json({listing:publicListing(l),bids:bids.results,favorite:!!fav,myBidder:me,isSeller:a?.id===l.seller_id,negotiations:negotiations?.results.map((n:any)=>{const {bidder_id,...rest}=n;return rest})||[],negotiationAvailable:!l.is_demo&&l.status==='active'&&l.ends_at>Date.now()&&l.starts_at+l.holding_period<=Date.now()&&!bids.results.length});
 }
 const account=await member(req);
 if(action==='favorite'){if(data.favorite===true)await db().prepare('INSERT INTO listing_favorites (listing_id,account_id,created_at) VALUES (?,?,?) ON CONFLICT DO NOTHING').bind(id,account.id,Date.now()).run();else await db().prepare('DELETE FROM listing_favorites WHERE listing_id=? AND account_id=?').bind(id,account.id).run();return json({ok:true})}
 if(action==='withdraw'){
  if(account.id!==l.seller_id)fail('Only the seller can withdraw this listing.',403);await expired(id);
  const r=await db().prepare("UPDATE listings SET status='withdrawn',version=version+1 WHERE id=? AND status IN ('pending','active') AND NOT EXISTS (SELECT 1 FROM bids WHERE listing_id=?) AND NOT EXISTS (SELECT 1 FROM negotiations WHERE listing_id=? AND status IN ('approved','seller_turn','buyer_turn'))").bind(id,id,id).run();if(!r.meta.changes)fail('Listings with bids or a live negotiation cannot be withdrawn.',409);
  await db().prepare("UPDATE negotiations SET status='rejected',version=version+1 WHERE listing_id=? AND status='requested'").bind(id).run();return json({ok:true});
 }
 active(l);const p=await bidder(l,account);
 if(action==='accept-terms'){if(!['auction','negotiation'].includes(data.kind)||data.agree!==true||data.version!==l.terms_version)fail('Accept the current terms.');await db().prepare('INSERT INTO listing_acceptances (listing_id,account_id,kind,terms_version,accepted_at) VALUES (?,?,?,?,?) ON CONFLICT DO NOTHING').bind(id,account.id,data.kind,l.terms_version,Date.now()).run();return json({bidderCode:p.bidder_code})}
 if(action==='bid'){
  await accepted(l,account,'auction');await rateLimit(req,'bid',100);if(await liveNegotiation(id))fail('This listing is in a private negotiation.',409);
  const base=l.current_price,amount=integer(data.amount,'bid amount in paisa',1,100000000000000);if(data.version!==l.version||![l.interval1,l.interval2,l.interval3].some(v=>base+v===amount))fail('Bidding changed. Refresh and choose a current amount.',409);
  const bidId=crypto.randomUUID(),now=Date.now();const result=await db().batch([
   db().prepare("INSERT INTO bids (id,listing_id,account_id,amount,version,created_at) SELECT ?,id,?,?,version+1,? FROM listings WHERE id=? AND version=? AND status='active' AND ends_at>? AND NOT EXISTS (SELECT 1 FROM negotiations WHERE listing_id=? AND status IN ('approved','seller_turn','buyer_turn') AND deadline>?)").bind(bidId,account.id,amount,now,id,l.version,now,id,now),
   db().prepare('UPDATE listings SET current_price=?,version=version+1 WHERE id=? AND version=? AND EXISTS (SELECT 1 FROM bids WHERE id=?)').bind(amount,id,l.version,bidId)]);
  if(!result[0].meta.changes)fail('Another action changed this listing. Refresh and retry.',409);return json({ok:true,bidderCode:p.bidder_code},201);
 }
 if(action==='request-negotiation'){
  await accepted(l,account,'auction');if(Date.now()<l.starts_at+l.holding_period)fail('The holding period has not ended.',409);if(l.is_demo)fail('Demo sellers cannot receive requests. Create a seller listing to try negotiation.');
  const n=crypto.randomUUID();const result=await db().prepare("INSERT INTO negotiations (id,listing_id,bidder_id,status,amount,deadline,created_at) SELECT ?,id,?,'requested',starting_price,?,? FROM listings WHERE id=? AND status='active' AND version=? AND NOT EXISTS (SELECT 1 FROM bids WHERE listing_id=?) AND NOT EXISTS (SELECT 1 FROM negotiations WHERE listing_id=? AND bidder_id=? AND status IN ('requested','approved','seller_turn','buyer_turn'))").bind(n,account.id,l.ends_at,Date.now(),id,l.version,id,id,account.id).run();if(!result.meta.changes)fail('Bids or an existing request prevent a new negotiation.',409);return json({id:n},201);
 }
 return fail('Not found.',404);
 }catch(e){return json({error:e instanceof Error?e.message:'Please try again.'},e instanceof Failure?e.status:400)}}

async function negotiationRequest(req:Request,id:string,action:string,data:any){
 const a=await member(req);let n=await db().prepare('SELECT * FROM negotiations WHERE id=?').bind(id).first<any>();if(!n)fail('Negotiation not found.',404);const l=await listing(n.listing_id),seller=l.seller_id===a.id,buyer=n.bidder_id===a.id;if(!seller&&!buyer)fail('This negotiation is private.',403);await expired(l.id);n=await db().prepare('SELECT * FROM negotiations WHERE id=?').bind(id).first<any>();
 if(req.method==='GET'){const history=await db().prepare('SELECT actor,action,amount,created_at FROM negotiation_events WHERE negotiation_id=? ORDER BY version DESC').bind(id).all();return json({negotiation:{id:n.id,listing_id:n.listing_id,status:n.status,amount:n.amount,deadline:n.deadline,version:n.version},listing:publicListing(l),isSeller:seller,history:history.results})}
 active(l);if(data.version!==n.version)fail('This negotiation changed. Refresh and retry.',409);
 const now=Date.now(),deadline=Math.min(now+l.negotiation_time,l.ends_at);let status='',amount=n.amount;
 if(action==='approve'||action==='reject'){
  if(!seller||n.status!=='requested')fail('Only the seller can respond to a pending request.',403);if(action==='approve'){if(await liveNegotiation(l.id))fail('Another negotiation is active.',409);if(await db().prepare('SELECT id FROM bids WHERE listing_id=? LIMIT 1').bind(l.id).first())fail('Bidding has already started.',409)}status=action==='approve'?'approved':'rejected';
 }else{
  if(!seller)await accepted(l,a,'negotiation');if(n.deadline<=now)fail('The negotiation response window expired.',409);
  if(action==='offer'){if(!buyer||!['approved','buyer_turn'].includes(n.status))fail('Wait for your turn.',409);amount=integer(data.amount,'offer in paisa',1,100000000000000);if(amount!==n.amount-l.negotiation_interval)fail('Decrease by exactly the negotiation interval.');status='seller_turn'}
  else if(action==='counter'){if(!seller||n.status!=='seller_turn')fail('Wait for your turn.',409);amount=n.amount+l.negotiation_interval;if(amount>l.starting_price)fail('A counter cannot exceed the starting price.');status='buyer_turn'}
  else if(action==='agree'){if(!(seller&&n.status==='seller_turn'||buyer&&n.status==='buyer_turn'))fail('There is no offer for you to accept.',409);status='agreed'}
  else if(action==='reject'){status='rejected'}else fail('Choose a valid negotiation action.');
 }
 const event=crypto.randomUUID();
 const result=await db().batch([
  db().prepare(`UPDATE negotiations SET status=?,amount=?,deadline=?,last_event=?,version=version+1 WHERE id=? AND version=? AND EXISTS (SELECT 1 FROM listings WHERE id=? AND version=? AND status='active' AND ends_at>?) ${action==='approve'?"AND NOT EXISTS (SELECT 1 FROM bids WHERE listing_id=?) AND NOT EXISTS (SELECT 1 FROM negotiations WHERE listing_id=? AND status IN ('approved','seller_turn','buyer_turn') AND deadline>?)":''}`).bind(status,amount,deadline,event,id,n.version,l.id,l.version,now,...(action==='approve'?[l.id,l.id,now]:[])),
  db().prepare('INSERT INTO negotiation_events (id,negotiation_id,actor,action,amount,version,created_at) SELECT ?,id,?,?,?,?,? FROM negotiations WHERE id=? AND last_event=?').bind(event,seller?'seller':'buyer',action,amount,n.version+1,now,id,event),
  db().prepare("UPDATE listings SET status=CASE WHEN ?='agreed' THEN 'agreed' ELSE status END,version=version+1 WHERE id=? AND version=? AND EXISTS (SELECT 1 FROM negotiation_events WHERE id=?)").bind(status,l.id,l.version,event)]);
 if(!result[0].meta.changes)fail('Another action changed this negotiation. Refresh and retry.',409);return json({ok:true,status});
}
