import {db, currentAccount} from './accounts';
import {isAdmin} from './admin-access';
import {money, fee, partyBalance, settlement, FINANCIAL_POLICY, type SettlementKind} from './fees';

class RequestError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
const responseHeaders = {'Content-Type':'application/json', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff'};
function json(value: unknown, status = 200) { return new Response(JSON.stringify(value), {status, headers:responseHeaders}); }
function text(value: unknown, label: string, min: number, max: number): string {
  if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max) throw new RequestError(`${label} must contain ${min}–${max} characters.`);
  return value.trim();
}
function party(value: unknown): 'buyer' | 'seller' {
  if (value !== 'buyer' && value !== 'seller') throw new RequestError('Choose buyer or seller.');
  return value;
}
function positiveMoney(value: unknown, label: string) {
  const result = money(value, label);
  if (result <= 0) throw new RequestError(`${label} must be greater than zero.`);
  return result;
}
function audit(dealId: string, actorId: string, action: string, details: object) {
  return db().prepare('INSERT INTO deal_audit (id,deal_id,actor_id,action,details,created_at) VALUES (?,?,?,?,?,?)')
    .bind(crypto.randomUUID(), dealId, actorId, action, JSON.stringify(details), Date.now());
}
async function loadDeal(id: string) {
  const deal = await db().prepare(`SELECT d.*,b.full_name buyer_name,s.full_name seller_name
    FROM deals d JOIN accounts b ON b.id=d.buyer_id JOIN accounts s ON s.id=d.seller_id WHERE d.id=?`).bind(id).first<any>();
  if (!deal) throw new RequestError('Deal not found.', 404);
  return deal;
}
async function paymentTotals(id: string) {
  const rows = await db().prepare(`SELECT party,purpose,SUM(amount) total FROM deal_payments
    WHERE deal_id=? AND status='received' GROUP BY party,purpose`).bind(id).all<any>();
  const sums = {buyer:{participation:0,service:0}, seller:{participation:0,service:0}};
  for (const row of rows.results) sums[party(row.party)][row.purpose as 'participation'|'service'] = Number(row.total);
  return sums;
}
async function detail(deal: any, account: any, admin: boolean) {
  const totals = await paymentTotals(deal.id);
  const balances = Object.fromEntries((['buyer','seller'] as const).map(p => [p, {
    depositRequired:deal[p+'_deposit'], depositReceived:totals[p].participation,
    ...partyBalance(deal.sale_price,deal[p+'_rate_bps'],totals[p].participation,totals[p].service),
  }]));
  const payments = await db().prepare(`SELECT id,party,purpose,amount,method,reference,status,received_at,void_reason,voided_at
    FROM deal_payments WHERE deal_id=? ${admin?'':'AND party=?'} ORDER BY received_at DESC`).bind(...(admin?[deal.id]:[deal.id,deal.buyer_id===account.id?'buyer':'seller'])).all();
  const events = admin ? (await db().prepare(`SELECT e.id,e.action,e.details,e.created_at,a.full_name actor_name
    FROM deal_audit e JOIN accounts a ON a.id=e.actor_id WHERE e.deal_id=? ORDER BY e.created_at DESC,e.rowid DESC LIMIT 200`).bind(deal.id).all()).results : [];
  const resolution=await db().prepare('SELECT * FROM deal_settlements WHERE deal_id=?').bind(deal.id).first();
  const disbursements=await db().prepare(`SELECT id,party,amount,method,reference,paid_at FROM deal_disbursements WHERE deal_id=? ${admin?'':'AND party=?'} ORDER BY paid_at DESC`).bind(...(admin?[deal.id]:[deal.id,deal.buyer_id===account.id?'buyer':'seller'])).all();
  const paidRows=await db().prepare('SELECT party,SUM(amount) amount FROM deal_disbursements WHERE deal_id=? GROUP BY party').bind(deal.id).all<any>();
  const paid={buyer:0,seller:0};for(const row of paidRows.results)paid[party(row.party)]=row.amount;
  return {deal, balances, payments:payments.results, events, resolution, disbursements:disbursements.results, paid,
    myParty:deal.buyer_id===account.id?'buyer':deal.seller_id===account.id?'seller':null,
    cardPaymentsEnabled:false, paymentProvider:'PayFast Pakistan', currency:'PKR', settlementPolicyConfirmed:true};
}

export async function dealRequest(req: Request, data?: any): Promise<Response> {
  try {
    const url = new URL(req.url), path = url.pathname, adminRoute = path.startsWith('/api/admin/');
    const account = await currentAccount(req);
    if (!account) throw new RequestError('Log in to continue.',401);
    const admin = isAdmin(account);
    if (adminRoute && !admin) throw new RequestError('Administrator access is required.',403);

    if (req.method === 'GET' && path === '/api/admin/overview') {
      const query = (url.searchParams.get('q') || '').trim().slice(0,120);
      const match = '%'+query.replace(/[\\%_]/g, '\\$&')+'%';
      const users = await db().prepare(`SELECT id,email,full_name,phone,profile_complete,created_at FROM accounts
        WHERE email LIKE ? ESCAPE '\\' OR full_name LIKE ? ESCAPE '\\' ORDER BY created_at DESC LIMIT 100`).bind(match,match).all();
      const interests = await db().prepare(`SELECT i.*,a.full_name,a.email FROM interests i JOIN accounts a ON a.id=i.account_id
        WHERE a.email LIKE ? ESCAPE '\\' OR a.full_name LIKE ? ESCAPE '\\' ORDER BY i.created_at DESC LIMIT 100`).bind(match,match).all();
      const deals = await db().prepare(`SELECT d.*,b.full_name buyer_name,s.full_name seller_name FROM deals d
        JOIN accounts b ON b.id=d.buyer_id JOIN accounts s ON s.id=d.seller_id
        WHERE d.title LIKE ? ESCAPE '\\' OR b.email LIKE ? ESCAPE '\\' OR s.email LIKE ? ESCAPE '\\' ORDER BY d.created_at DESC LIMIT 100`).bind(match,match,match).all();
      const counts = await db().prepare(`SELECT (SELECT count(*) FROM accounts) accounts,(SELECT count(*) FROM interests) interests,
        (SELECT count(*) FROM deals WHERE status IN ('awaiting_deposits','active')) open_deals,
        (SELECT COALESCE(SUM(amount),0) FROM deal_payments WHERE status='received') received`).first();
      return json({accounts:users.results,interests:interests.results,deals:deals.results,counts});
    }
    if (req.method === 'GET' && path === '/api/deals') {
      const rows = await db().prepare(`SELECT d.*,b.full_name buyer_name,s.full_name seller_name FROM deals d
        JOIN accounts b ON b.id=d.buyer_id JOIN accounts s ON s.id=d.seller_id
        WHERE buyer_id=? OR seller_id=? ORDER BY created_at DESC LIMIT 100`).bind(account.id,account.id).all();
      return json({deals:rows.results});
    }
    if (req.method === 'POST' && path === '/api/admin/deals') {
      const title = text(data.title,'Deal title',5,160), buyerId = text(data.buyerId,'Buyer ID',1,80), sellerId = text(data.sellerId,'Seller ID',1,80);
      if (buyerId === sellerId) throw new RequestError('Buyer and seller must be different accounts.');
      const participants = await db().prepare('SELECT id,profile_complete FROM accounts WHERE id IN (?,?)').bind(buyerId,sellerId).all<any>();
      if (participants.results.length !== 2 || participants.results.some(a=>!a.profile_complete)) throw new RequestError('Both parties must have registered, complete profiles.');
      const price = positiveMoney(data.salePrice,'Sale price'), buyerDeposit = positiveMoney(data.buyerDeposit,'Buyer participation fee'), sellerDeposit = positiveMoney(data.sellerDeposit,'Seller participation fee');
      const buyerRate = data.buyerRateBps, sellerRate = data.sellerRateBps;
      fee(price,buyerRate); fee(price,sellerRate);
      const terms = text(data.terms,'Deal terms',30,5000)+'\n\nParticipation and settlement policy:\n'+FINANCIAL_POLICY, id = crypto.randomUUID(), now = Date.now();
      await db().batch([
        db().prepare(`INSERT INTO deals (id,title,buyer_id,seller_id,sale_price,buyer_rate_bps,seller_rate_bps,buyer_deposit,seller_deposit,terms,created_by,created_at,updated_at)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(id,title,buyerId,sellerId,price,buyerRate,sellerRate,buyerDeposit,sellerDeposit,terms,account.id,now,now),
        audit(id,account.id,'deal_created',{title,buyerId,sellerId,price,buyerRate,sellerRate,buyerDeposit,sellerDeposit}),
      ]);
      return json({id},201);
    }
    const route = path.match(/^\/api\/(admin\/)?deals\/([^/]+)(?:\/(accept|payments|void|activate|complete|dispute|resolve|payouts))?$/);
    if (!route) throw new RequestError('Not found.',404);
    const deal = await loadDeal(route[2]);
    if (!adminRoute && deal.buyer_id!==account.id && deal.seller_id!==account.id) throw new RequestError('Deal not found.',404);
    if (req.method === 'GET' && !route[3]) return json(await detail(deal,account,adminRoute));
    if (req.method !== 'POST') throw new RequestError('Not found.',404);
    if (route[3]==='accept' && !adminRoute) {
      const p = deal.buyer_id===account.id?'buyer':'seller';
      if (data.confirm !== true) throw new RequestError('Confirm that you have read and accept the displayed fee terms.');
      if (!['awaiting_deposits','active'].includes(deal.status)) throw new RequestError('This deal is closed or under review.');
      // Terms are immutable; repeated acceptance leaves the original timestamp intact.
      await db().batch([
        db().prepare(`UPDATE deals SET ${p}_accepted_at=COALESCE(${p}_accepted_at,?),updated_at=? WHERE id=?`).bind(Date.now(),Date.now(),deal.id),
        audit(deal.id,account.id,'terms_accepted',{party:p}),
      ]);
      return json({ok:true});
    }
    if (!adminRoute) throw new RequestError('Administrator access is required.',403);
    if (route[3]==='resolve' || route[3]==='complete') {
      const kind: SettlementKind=route[3]==='complete'?'completed':data.outcome;
      if (!['completed','default_buyer','default_seller','mutual_cancel'].includes(kind)) throw new RequestError('Choose a valid settlement outcome.');
      if (kind==='completed' && deal.status!=='active') throw new RequestError('Only an active deal can be completed.');
      if (kind!=='completed' && deal.status!=='disputed') throw new RequestError('Place the deal on hold before deciding a withdrawal or cancellation.');
      if (data.confirm!==true) throw new RequestError('Confirm the final settlement decision. It cannot be edited.');
      const reason=text(data.reason,'Decision and evidence reference',10,1000);
      const allocation=settlement(kind,deal.sale_price,deal.buyer_rate_bps,deal.seller_rate_bps,await paymentTotals(deal.id));
      const status=kind==='completed'?'completed':kind==='mutual_cancel'?'cancelled':'defaulted';
      await db().batch([
        db().prepare('UPDATE deals SET status=?,updated_at=? WHERE id=?').bind(status,Date.now(),deal.id),
        db().prepare(`INSERT INTO deal_settlements (deal_id,kind,buyer_refund,seller_refund,buyer_compensation,seller_compensation,platform_retained,total_received,reason,decided_by,created_at)
          VALUES (?,?,?,?,?,?,?,?,?,?,?)`).bind(deal.id,kind,allocation.buyerRefund,allocation.sellerRefund,allocation.buyerCompensation,allocation.sellerCompensation,allocation.platformRetained,allocation.totalReceived,reason,account.id,Date.now()),
        audit(deal.id,account.id,'settlement_decided',{kind,reason,...allocation}),
      ]);
      return json({ok:true,allocation});
    }
    if(route[3]==='payouts') {
      const p=party(data.party), amount=positiveMoney(data.amount,'Payout'), reference=text(data.reference,'Payout reference',3,100);
      if(!['cash','bank_transfer'].includes(data.method))throw new RequestError('Choose cash or an externally completed bank transfer.');
      if(data.confirm!==true)throw new RequestError('Confirm that the refund or compensation was actually paid.');
      const resolution=await db().prepare('SELECT deal_id FROM deal_settlements WHERE deal_id=?').bind(deal.id).first();
      if(!resolution)throw new RequestError('Settle the deal before recording a payout.');
      const existing=await db().prepare('SELECT * FROM deal_disbursements WHERE reference=?').bind(reference).first<any>();
      if(existing){
        if(existing.deal_id===deal.id&&existing.party===p&&existing.amount===amount&&existing.method===data.method)return json({id:existing.id,alreadyRecorded:true});
        throw new RequestError('That payout reference is already used.',409);
      }
      const id=crypto.randomUUID();
      await db().batch([
        db().prepare('INSERT INTO deal_disbursements (id,deal_id,party,amount,method,reference,recorded_by,paid_at) VALUES (?,?,?,?,?,?,?,?)').bind(id,deal.id,p,amount,data.method,reference,account.id,Date.now()),
        audit(deal.id,account.id,'payout_recorded',{party:p,amount,reference,method:data.method}),
      ]);
      return json({id},201);
    }
    if (route[3]==='payments') {
      const p = party(data.party), purpose = data.purpose;
      if (!['participation','service'].includes(purpose)) throw new RequestError('Choose participation or service charges.');
      if (data.method !== 'cash') throw new RequestError('Card collection is not connected yet. Only received cash can be recorded.');
      const amount = positiveMoney(data.amount,'Payment'), reference = text(data.reference,'Unique cash receipt number',3,100);
      const existing = await db().prepare('SELECT * FROM deal_payments WHERE reference=?').bind(reference).first<any>();
      if (existing) {
        if (existing.deal_id===deal.id && existing.party===p && existing.purpose===purpose && existing.amount===amount && existing.status==='received') return json({id:existing.id,alreadyRecorded:true});
        throw new RequestError('That receipt number is already used. Review payment history.',409);
      }
      const id=crypto.randomUUID();
      await db().batch([
        db().prepare('INSERT INTO deal_payments (id,deal_id,party,purpose,amount,method,reference,recorded_by,received_at) VALUES (?,?,?,?,?,?,?,?,?)').bind(id,deal.id,p,purpose,amount,'cash',reference,account.id,Date.now()),
        audit(deal.id,account.id,'cash_received',{paymentId:id,party:p,purpose,amount,reference}),
      ]);
      return json({id},201);
    }
    if (route[3]==='void') {
      const paymentId=text(data.paymentId,'Payment ID',1,80), reason=text(data.reason,'Correction reason',5,500);
      const payment=await db().prepare('SELECT * FROM deal_payments WHERE id=? AND deal_id=?').bind(paymentId,deal.id).first<any>();
      if (!payment) throw new RequestError('Receipt not found.',404);
      if (payment.status!=='received') throw new RequestError('This receipt was already voided.',409);
      await db().batch([
        db().prepare("UPDATE deal_payments SET status='voided',voided_by=?,void_reason=?,voided_at=? WHERE id=? AND deal_id=?").bind(account.id,reason,Date.now(),paymentId,deal.id),
        audit(deal.id,account.id,'receipt_voided',{paymentId,reason}),
      ]);
      return json({ok:true});
    }
    if (['activate','dispute'].includes(route[3] || '')) {
      const action=route[3], reason=text(data.reason,'Action note',5,1000);
      if (action==='activate' && deal.status!=='awaiting_deposits') throw new RequestError('Only a deal awaiting deposits can be activated.');
      if (action==='dispute' && !['awaiting_deposits','active'].includes(deal.status)) throw new RequestError('This deal is already closed or under review.');
      const next=action==='activate'?'active':'disputed';
      await db().batch([
        db().prepare('UPDATE deals SET status=?,updated_at=? WHERE id=?').bind(next,Date.now(),deal.id),
        audit(deal.id,account.id,'deal_'+next,{reason}),
      ]);
      return json({ok:true});
    }
    throw new RequestError('Not found.',404);
  } catch(error) {
    if (error instanceof RequestError) return json({error:error.message},error.status);
    const message=error instanceof Error?error.message:'';
    const safeMessages = ['Both parties must accept','Participation payment exceeds','Service payment exceeds','Service payment requires','Both deposits must be paid','Service charges must be paid','Receipts can only be voided','A receipt can only be voided','Invalid deal status transition','Payout exceeds','Payments changed during settlement','Settlement does not match','Terms cannot be accepted'];
    if (safeMessages.some(part=>message.includes(part))) return json({error:message.split('SQLITE_CONSTRAINT')[0].replace(/^D1_ERROR:\s*/, '').trim()},409);
    if (message.includes('UNIQUE constraint')) return json({error:'This record or receipt already exists. Refresh and review the history.'},409);
    if (message.includes('must be') || message.includes('supported range')) return json({error:message},400);
    return json({error:'Deal storage is unavailable. Check that the latest database migration has been applied.'},503);
  }
}
