const amount = value => 'Rs '+(Number(value)/100).toLocaleString('en-PK',{minimumFractionDigits:2,maximumFractionDigits:2});
const statusText = value => ({awaiting_deposits:'Awaiting deposits',active:'Active',completed:'Completed',disputed:'Under review',cancelled:'Cancelled',defaulted:'Default settled',received:'Received',voided:'Voided'}[value] || value);
const when = value => value ? new Date(value).toLocaleString('en-PK',{timeZone:'Asia/Karachi',dateStyle:'medium',timeStyle:'short'}) : 'Not accepted';
const rate = value => (value/100).toFixed(2)+'%';
const label = value => value==='buyer'?'Buyer':'Seller';

function field(name,title,attributes='',value='') {
  return `<div class="field"><label for="m-${name}">${title}</label><input id="m-${name}" name="${name}" ${attributes} value="${value}"></div>`;
}
function frame(ctx,admin,content) {
  const {esc,user} = ctx;
  return `<section class="management"><aside class="management-rail"><a href="#/" class="management-brand">AUCTIONHOUSE<span>.PK</span></a><small>${admin?'OPERATIONS':'YOUR ACCOUNT'}</small><a href="${admin?'#/admin':'#/deals'}" class="selected">${admin?'Overview':'My deals'} <span>↗</span></a><a href="#/workspace">${admin?'My interests':'Saved interests'} <span>↗</span></a><a href="#/marketplace">Marketplace <span>↗</span></a><div class="rail-profile"><span class="rail-avatar">${esc(user.fullName.slice(0,1))}</span><strong>${esc(user.fullName)}</strong><small>${admin?'Administrator':'Member'}</small><a href="#/account">Account settings ↗</a></div></aside><div class="management-main">${content}</div></section>`;
}
function heading(title,description,extra='') {
  return `<div class="management-heading"><div><div class="eyebrow">[ DEAL DESK ]</div><h1>${title}</h1><p>${description}</p></div>${extra}</div>`;
}
function dealRows(ctx,deals,admin) {
  const {esc}=ctx;
  return deals.length ? `<div class="management-table-wrap"><table class="management-table"><thead><tr><th>Deal</th><th>Parties</th><th>Sale price</th><th>Status</th><th><span class="sr-only">Open</span></th></tr></thead><tbody>${deals.map(d=>`<tr><td><a href="#/${admin?'admin/deal':'deals'}/${encodeURIComponent(d.id)}"><strong>${esc(d.title)}</strong></a><small>${when(d.created_at)}</small></td><td><span>${esc(d.buyer_name)}</span><small>buying from ${esc(d.seller_name)}</small></td><td class="money-cell">${amount(d.sale_price)}</td><td><span class="deal-status status-${esc(d.status)}">${statusText(d.status)}</span></td><td><a class="text-link" href="#/${admin?'admin/deal':'deals'}/${encodeURIComponent(d.id)}">Open ↗</a></td></tr>`).join('')}</tbody></table></div>` : '<div class="management-empty"><span>↗</span><h3>No deals yet.</h3><p>Matched buying and selling plans will appear here once a deal is issued.</p></div>';
}

export async function renderAdmin(ctx,id) {
  if (!ctx.user) {ctx.loginRequired(id?'/admin/deal/'+id:'/admin');return;}
  if (!ctx.user.isAdmin) {
    ctx.root.innerHTML=ctx.pageTop('Private workspace.','Administrator access is required to view this page.','Admin')+'<section class="section"><a href="#/account" class="btn btn-black">Back to my account ↗</a></section>';
    return;
  }
  if(id) return renderDetail(ctx,id,true);
  const {api,esc,root}=ctx;
  root.innerHTML=frame(ctx,true,heading('A clear view.<br>Of every next move.','Manage people, deal terms and participation payments.')+'<div class="panel" role="status">Loading your workspace…</div>');
  async function load(query='') {
    try {
      const result=await api('/api/admin/overview?q='+encodeURIComponent(query));
      if(!ctx.isCurrent())return;
      root.innerHTML=frame(ctx,true,heading('Your deal desk.','A clear record, from first interest to completed sale.','<button class="btn btn-black" id="new-deal">Create a deal <span>＋</span></button>')+
        `<div class="management-stats"><article><small>REGISTERED PEOPLE</small><strong>${result.counts.accounts}</strong><span>Buyer and seller accounts</span></article><article><small>SAVED INTERESTS</small><strong>${result.counts.interests}</strong><span>Buying and selling plans</span></article><article><small>OPEN DEALS</small><strong>${result.counts.open_deals}</strong><span>Awaiting deposits or active</span></article><article><small>CASH RECEIVED</small><strong>${amount(result.counts.received)}</strong><span>Includes deposits held; not net revenue</span></article></div>`+
        `<div class="management-notice"><strong>Every fee, agreed in advance.</strong><p>Set participation amounts for each deal. Both parties accept the terms before you record cash. Deposits count towards service charges on a successful sale.</p></div>`+
        `<section id="deal-create" class="panel" hidden></section><form id="desk-search" class="desk-search"><label class="sr-only" for="desk-query">Search people or deals</label><input id="desk-query" name="q" placeholder="Search by name, email or deal title" value="${esc(query)}" maxlength="120"><button class="btn btn-outline small" type="submit">Search</button></form>`+
        `<div class="management-tabs" role="tablist" aria-label="Admin sections"><button role="tab" aria-selected="true" aria-controls="desk-content" id="tab-deals" data-tab="deals">Deals <span>${result.deals.length}</span></button><button role="tab" aria-selected="false" aria-controls="desk-content" id="tab-people" data-tab="people">People <span>${result.accounts.length}</span></button><button role="tab" aria-selected="false" aria-controls="desk-content" id="tab-interests" data-tab="interests">Interests <span>${result.interests.length}</span></button></div><div id="desk-content" role="tabpanel" aria-labelledby="tab-deals"></div><p class="management-footnote">Showing up to 100 recent records per section. Use search to find older people and deals.</p>`);
      const content=root.querySelector('#desk-content');
      function tab(name) {
        for(const b of root.querySelectorAll('[data-tab]'))b.setAttribute('aria-selected',String(b.dataset.tab===name));
        content.setAttribute('aria-labelledby','tab-'+name);
        if(name==='deals')content.innerHTML=dealRows(ctx,result.deals,true);
        if(name==='people')content.innerHTML=`<div class="management-table-wrap"><table class="management-table"><thead><tr><th>Person</th><th>Contact</th><th>Profile</th><th>Joined</th></tr></thead><tbody>${result.accounts.map(a=>`<tr><td><strong>${esc(a.full_name)}</strong></td><td>${esc(a.email)}<small>${esc(a.phone||'No phone')}</small></td><td><span class="deal-status">${a.profile_complete?'Complete':'Incomplete'}</span></td><td>${when(a.created_at)}</td></tr>`).join('')||'<tr><td colspan="4">No matching accounts.</td></tr>'}</tbody></table></div>`;
        if(name==='interests')content.innerHTML=`<div class="management-table-wrap"><table class="management-table"><thead><tr><th>Person</th><th>Interest</th><th>Budget</th><th>Notes</th></tr></thead><tbody>${result.interests.map(i=>`<tr><td><strong>${esc(i.full_name)}</strong><small>${esc(i.email)}</small></td><td><span class="deal-status">${i.role==='sell'?'Selling':'Buying'}</span><small>${esc(i.project==='axis'?'Pine Axis':'Pine Executive')} · ${esc(i.category)}</small></td><td>${i.budget==null?'Not specified':amount(i.budget*100)}</td><td class="terms-text">${esc(i.notes||'—')}<small>${esc(i.allotment||'')}</small></td></tr>`).join('')||'<tr><td colspan="4">No matching interests.</td></tr>'}</tbody></table></div>`;
      }
      tab('deals');
      for(const b of root.querySelectorAll('[data-tab]'))b.onclick=()=>tab(b.dataset.tab);
      root.querySelector('#desk-search').onsubmit=e=>{e.preventDefault();load(new FormData(e.target).get('q'));};
      root.querySelector('#new-deal').onclick=()=>createForm(ctx,result.accounts,load);
    } catch(error) {if(ctx.isCurrent())root.innerHTML=frame(ctx,true,heading('Workspace unavailable.','Your records have not been changed.')+`<div class="form-error" role="alert">${esc(error.message)}</div>`);}
  }
  await load();
}

function createForm(ctx,accounts,reload) {
  const {root,esc}=ctx, panel=root.querySelector('#deal-create');
  const options='<option value="">Choose a registered account</option>'+accounts.filter(a=>a.profile_complete).map(a=>`<option value="${esc(a.id)}">${esc(a.full_name)} · ${esc(a.email)}</option>`).join('');
  panel.hidden=false;
  panel.innerHTML=`<div class="section-head"><div><h2>Set the terms.</h2><p>Issued terms stay fixed. Check the parties and amounts before saving.</p></div><button class="btn btn-outline small" id="close-create">Close</button></div><div class="form-error" role="alert" hidden></div><form id="create-form"><div class="form-grid">${field('title','Deal / property reference','required minlength="5" maxlength="160" placeholder="e.g. Pine Executive · file reference"')}<div class="field"><label for="m-salePrice">Agreed sale price (PKR)</label><input id="m-salePrice" name="salePrice" required type="number" min="0.01" step="0.01"></div><div class="field"><label for="m-buyerId">Buyer</label><select id="m-buyerId" name="buyerId" required>${options}</select></div><div class="field"><label for="m-sellerId">Seller</label><select id="m-sellerId" name="sellerId" required>${options}</select></div>${field('buyerRate','Buyer service charge (%)','type="number" min="0.50" max="2" step="0.01" required','0.50')}${field('sellerRate','Seller service charge (%)','type="number" min="0.50" max="2" step="0.01" required','0.50')}${field('buyerDeposit','Buyer participation fee (PKR)','type="number" min="0.01" step="0.01" required')}${field('sellerDeposit','Seller participation fee (PKR)','type="number" min="0.01" step="0.01" required')}<div class="field full"><label for="m-terms">Terms shown to both parties</label><textarea id="m-terms" name="terms" required minlength="30" maxlength="5000" placeholder="Include property/file reference, agreed price, dates, service scope and agreed withdrawal terms."></textarea><small>Both parties must accept before payment. The participation and settlement policy is automatically attached to the issued terms.</small></div></div><div class="fee-preview" id="fee-preview" aria-live="polite"></div><button class="btn btn-black" type="submit">Issue deal terms ↗</button></form>`;
  root.querySelector('#close-create').onclick=()=>{panel.hidden=true;};
  const form=panel.querySelector('form');
  form.oninput=()=>{
    const d=Object.fromEntries(new FormData(form)), price=Number(d.salePrice);
    panel.querySelector('#fee-preview').textContent=price>0?`Estimated service charges — buyer: ${amount(Math.round(price*Number(d.buyerRate)))} · seller: ${amount(Math.round(price*Number(d.sellerRate)))}`:'';
  };
  form.onsubmit=async e=>{
    e.preventDefault();ctx.pending(form,true);panel.querySelector('.form-error').hidden=true;
    try {
      const data=Object.fromEntries(new FormData(form));data.buyerRateBps=Math.round(Number(data.buyerRate)*100);data.sellerRateBps=Math.round(Number(data.sellerRate)*100);
      const result=await ctx.api('/api/admin/deals',data);
      if(ctx.isCurrent()){ctx.toast('Deal issued. Both parties can review it in My deals.');location.hash='/admin/deal/'+result.id;}
    } catch(error) {const el=panel.querySelector('.form-error');el.textContent=error.message;el.hidden=false;ctx.pending(form,false);}
  };
  panel.scrollIntoView({behavior:'smooth',block:'start'});
}

export async function renderDeals(ctx,id) {
  if(!ctx.user){ctx.loginRequired(id?'/deals/'+id:'/deals');return;}
  if(id)return renderDetail(ctx,id,false);
  const {root,api,esc}=ctx;
  root.innerHTML=frame(ctx,false,heading('Your deals.','The terms, payments and next steps, all in one place.')+'<div class="panel" role="status">Loading your deals…</div>');
  try {
    const result=await api('/api/deals');if(!ctx.isCurrent())return;
    root.innerHTML=frame(ctx,false,heading('Your deals.','Review your agreed fees and keep track of every receipt.')+dealRows(ctx,result.deals,false));
  }catch(error){if(ctx.isCurrent())root.innerHTML=frame(ctx,false,heading('Deals unavailable.','Please try again shortly.')+`<div class="form-error" role="alert">${esc(error.message)}</div>`);}
}

async function renderDetail(ctx,id,admin) {
  const {root,api,esc}=ctx, prefix=admin?'/api/admin/deals/':'/api/deals/';
  root.innerHTML=frame(ctx,admin,heading('Your deal.','Loading terms and receipts…'));
  try {
    const result=await api(prefix+encodeURIComponent(id));if(!ctx.isCurrent())return;
    const {deal:d,balances,payments,events,myParty,resolution,disbursements,paid}=result;
    const open=['awaiting_deposits','active'].includes(d.status), bothAccepted=!!(d.buyer_accepted_at&&d.seller_accepted_at);
    const panels=['buyer','seller'].map(p=>{
      const b=balances[p];
      return `<article class="panel party-panel"><div class="party-heading"><span>${label(p)}${myParty===p?' · you':''}</span><span class="deal-status">${rate(d[p+'_rate_bps'])} service charge</span></div><h2>${esc(d[p+'_name'])}</h2><p class="acceptance">${d[p+'_accepted_at']?'Terms accepted · '+when(d[p+'_accepted_at']):'Terms awaiting acceptance'}</p><dl class="fee-lines"><div><dt>Agreed participation fee</dt><dd>${amount(b.depositRequired)}</dd></div><div><dt>Participation received</dt><dd>${amount(b.depositReceived)}</dd></div><div><dt>Participation outstanding</dt><dd>${amount(Math.max(0,b.depositRequired-b.depositReceived))}</dd></div><div><dt>Total service charge</dt><dd>${amount(b.serviceCharge)}</dd></div><div><dt>Deposit credit on completion</dt><dd>− ${amount(b.depositCredit)}</dd></div><div><dt>Additional service payment received</dt><dd>− ${amount(b.servicePaid)}</dd></div><div class="fee-total"><dt>Service balance after credit</dt><dd>${amount(b.remaining)}</dd></div>${b.refundable>0?`<div><dt>Excess due back on successful completion</dt><dd>${amount(b.refundable)}</dd></div>`:''}</dl><small>Deposit credit applies to a successful sale. Participation money remains held while a withdrawal is under review.</small></article>`;
    }).join('');
    root.innerHTML=frame(ctx,admin,`<a class="text-link management-back" href="${admin?'#/admin':'#/deals'}">← ${admin?'Deal desk':'My deals'}</a>`+heading(esc(d.title),`Agreed sale price · ${amount(d.sale_price)}`,`<span class="deal-status status-${esc(d.status)}">${statusText(d.status)}</span>`)+
      `${resolution?settlementPanel(ctx,d,resolution,paid):`<div class="deal-party-grid">${panels}</div>`}<div class="deal-detail-grid"><div><section class="panel"><div class="eyebrow">[ THE AGREEMENT ]</div><h2>Clear terms. Shared expectations.</h2><p class="terms-text">${esc(d.terms)}</p><p class="management-footnote">Issued ${when(d.created_at)} · Deal ${esc(d.id)}</p>${!admin&&myParty&&!d[myParty+'_accepted_at']&&open?`<form id="accept-terms"><label class="consent-check"><input type="checkbox" name="confirm" required> <span>I have read and accept this deal’s displayed price, fees and terms.</span></label><button class="btn btn-black" type="submit">Accept these terms ↗</button></form>`:''}</section><section class="panel"><div class="eyebrow">[ PAYMENT HISTORY ]</div><h2>Every receipt, in view.</h2><div id="receipts">${receiptTable(ctx,payments,admin,d.status)}</div></section>${admin?`<section class="panel"><h2>Activity trail.</h2><ol class="audit-list">${events.map(e=>`<li><strong>${esc(e.action.replaceAll('_',' '))}</strong><small>${esc(e.actor_name)} · ${when(e.created_at)}</small><p>${esc(eventText(e))}</p></li>`).join('')||'<li>No activity yet.</li>'}</ol></section>`:''}</div><aside><div class="form-error" id="deal-error" role="alert" hidden></div>${admin&&open?cashForm(bothAccepted):''}${admin&&d.status==='disputed'?resolutionForm():''}${admin&&resolution?payoutForm():''}<section class="panel online-payment-panel"><span class="payment-icon">▣</span><h3>Payment options.</h3><p>Cash participation payments are recorded by the administrator and appear in your receipt history.</p><span class="deal-status">PayFast Pakistan / PKR</span><p>Card payments become available after PayFast merchant activation and checkout setup.</p>${admin?'<p><a class="text-link" href="https://gopayfast.com/" target="_blank" rel="noopener">Open PayFast Pakistan</a></p>':''}</section>${admin&&open?`<section class="panel"><h3>Move the deal forward.</h3><p>${d.status==='awaiting_deposits'?'Activate once both parties have accepted and both participation fees are fully received.':'Complete after the sale and payment of the remaining service charges.'}</p><form id="status-form"><div class="field"><label for="action-reason">Action note / sale reference</label><textarea id="action-reason" name="reason" required minlength="5" maxlength="1000"></textarea></div>${d.status==='active'?'<label class="consent-check"><input type="checkbox" name="confirm" required><span>I have verified the sale and the proposed action. Completion creates a final settlement.</span></label>':''}<div class="btn-row"><button type="submit" name="action" value="${d.status==='awaiting_deposits'?'activate':'complete'}" class="btn btn-black">${d.status==='awaiting_deposits'?'Activate deal':'Mark sale completed'}</button><button type="submit" name="action" value="dispute" class="btn btn-outline">Hold for review</button></div></form><small>A hold freezes receipts and opens the withdrawal / cancellation review. A final decision creates refund and compensation entitlements.</small></section>`:''}${d.status==='disputed'?'<section class="panel review-callout"><h3>Funds on hold.</h3><p>This deal needs review. Payments remain frozen until an administrator records the outcome and evidence reference.</p></section>':''}${resolution?`<section class="panel"><h3>Refund and compensation history.</h3>${payoutHistory(ctx,disbursements)}<small>Amounts due remain outstanding until a completed payout is recorded.</small></section>`:''}</aside></div>`);
    async function perform(form,path,data,message) {
      const errorBox=root.querySelector('#deal-error');errorBox.hidden=true;ctx.pending(form,true);
      try{await api(path,data);if(ctx.isCurrent()){ctx.toast(message);await renderDetail(ctx,id,admin);}}
      catch(error){if(ctx.isCurrent()){errorBox.textContent=error.message;errorBox.hidden=false;errorBox.scrollIntoView({block:'center',behavior:'smooth'});ctx.pending(form,false);}}
    }
    const consent=root.querySelector('#accept-terms');if(consent)consent.onsubmit=e=>{e.preventDefault();perform(consent,prefix+encodeURIComponent(id)+'/accept',{confirm:true},'Terms accepted.');};
    const cash=root.querySelector('#cash-form');if(cash)cash.onsubmit=e=>{e.preventDefault();perform(cash,prefix+encodeURIComponent(id)+'/payments',{...Object.fromEntries(new FormData(cash)),method:'cash'},'Cash receipt recorded.');};
    const status=root.querySelector('#status-form');if(status)status.onsubmit=e=>{e.preventDefault();const action=e.submitter?.value;if(!['activate','complete','dispute'].includes(action))return;perform(status,prefix+encodeURIComponent(id)+'/'+action,{reason:new FormData(status).get('reason'),confirm:new FormData(status).get('confirm')==='on'},'Deal updated.');};
    const resolve=root.querySelector('#resolve-form');if(resolve){
      const preview=()=>{const outcome=new FormData(resolve).get('outcome');resolve.querySelector('#resolution-preview').textContent=previewResolution(outcome,balances);};
      resolve.oninput=preview;preview();
      resolve.onsubmit=e=>{e.preventDefault();perform(resolve,prefix+encodeURIComponent(id)+'/resolve',{...Object.fromEntries(new FormData(resolve)),confirm:true},'Final settlement recorded. Payouts are tracked separately.');};
    }
    const payout=root.querySelector('#payout-form');if(payout)payout.onsubmit=e=>{e.preventDefault();perform(payout,prefix+encodeURIComponent(id)+'/payouts',{...Object.fromEntries(new FormData(payout)),confirm:true},'Completed payout recorded.');};
    for(const button of root.querySelectorAll('[data-void]'))button.onclick=()=>{
      const reference=button.dataset.void;const row=button.closest('tr');
      if(row.querySelector('form'))return;
      const cell=document.createElement('td');cell.colSpan=6;cell.innerHTML='<form class="void-form"><label>Reason for voiding this receipt<input name="reason" required minlength="5" maxlength="500" placeholder="Explain the recording error"></label><button type="submit" class="btn btn-outline small">Confirm void</button></form>';
      const tr=document.createElement('tr');tr.append(cell);row.after(tr);
      cell.querySelector('form').onsubmit=e=>{e.preventDefault();perform(e.target,prefix+encodeURIComponent(id)+'/void',{paymentId:reference,reason:new FormData(e.target).get('reason')},'Receipt voided; history preserved.');};
      cell.querySelector('input').focus();
    };
  }catch(error){if(ctx.isCurrent())root.innerHTML=frame(ctx,admin,heading('Deal unavailable.','Please check your access and try again.')+`<div class="form-error" role="alert">${esc(error.message)}</div>`);}
}

function cashForm(accepted) {
  return `<section class="panel"><div class="eyebrow">[ CASH DESK ]</div><h3>Record a received payment.</h3>${accepted?`<form id="cash-form"><div class="field"><label for="cash-party">Received from</label><select id="cash-party" name="party"><option value="buyer">Buyer</option><option value="seller">Seller</option></select></div><div class="field"><label for="cash-purpose">Payment for</label><select id="cash-purpose" name="purpose"><option value="participation">Participation fee</option><option value="service">Remaining service charges</option></select></div>${field('amount','Amount received (PKR)','type="number" min="0.01" step="0.01" required')}${field('reference','Unique cash receipt number','required minlength="3" maxlength="100" placeholder="e.g. AH-2026-0001"')}<label class="consent-check"><input type="checkbox" required><span>I confirm the cash was received and the receipt number is correct.</span></label><button class="btn btn-black" type="submit">Record cash receipt ↗</button></form>`:'<p>Both parties must accept the issued terms before you record a payment.</p>'}</section>`;
}
function receiptTable(ctx,payments,admin,status) {
  const {esc}=ctx;
  return payments.length?`<div class="management-table-wrap"><table class="management-table receipt-table"><thead><tr><th>Receipt</th><th>Party / purpose</th><th>Amount</th><th>Status</th>${admin?'<th>Correction</th>':''}</tr></thead><tbody>${payments.map(p=>`<tr><td><strong>${esc(p.reference)}</strong><small>Cash · ${when(p.received_at)}</small></td><td>${label(p.party)}<small>${p.purpose==='participation'?'Participation':'Service charges'}</small></td><td class="money-cell">${amount(p.amount)}</td><td><span class="deal-status">${statusText(p.status)}</span>${p.void_reason?`<small>${esc(p.void_reason)}</small>`:''}</td>${admin?`<td>${status==='awaiting_deposits'&&p.status==='received'?`<button class="text-link" data-void="${esc(p.id)}">Void receipt</button>`:'—'}</td>`:''}</tr>`).join('')}</tbody></table></div>`:'<p class="management-footnote">No receipts recorded yet.</p>';
}
function eventText(event) {
  try{const d=JSON.parse(event.details);return d.reason || (d.reference?`Receipt ${d.reference} · ${amount(d.amount)}`:d.party?`${label(d.party)} accepted the issued terms.`:'Deal terms issued to both parties.');}catch{return '';}
}

function settlementPanel(ctx,deal,resolution,paid) {
  const {esc}=ctx;
  const outcome={completed:'Sale completed',mutual_cancel:'Cancelled without fault',default_buyer:'Buyer default confirmed',default_seller:'Seller default confirmed'}[resolution.kind];
  return `<section class="panel settlement-panel"><div class="eyebrow">[ FINAL SETTLEMENT ]</div><h2>${outcome}</h2><p class="terms-text">${esc(resolution.reason)}</p><div class="settlement-grid">${['buyer','seller'].map(p=>{
    const refund=resolution[p+'_refund'], compensation=resolution[p+'_compensation'];
    return `<article><small>${label(p)} · ${esc(deal[p+'_name'])}</small><dl class="fee-lines"><div><dt>Refund entitlement</dt><dd>${amount(refund)}</dd></div><div><dt>Compensation entitlement</dt><dd>${amount(compensation)}</dd></div><div><dt>Paid back so far</dt><dd>− ${amount(paid[p])}</dd></div><div class="fee-total"><dt>Still due to ${p}</dt><dd>${amount(refund+compensation-paid[p])}</dd></div></dl></article>`;
  }).join('')}</div><p class="management-footnote">AuctionHouse allocation: ${amount(resolution.platform_retained)} ${resolution.kind==='completed'?'in service charges':'from forfeiture'}. Allocation records the decision; actual refunds and compensation appear in payout history.</p></section>`;
}
function resolutionForm() {
  return `<section class="panel"><div class="eyebrow">[ WITHDRAWAL REVIEW ]</div><h3>Decide the outcome.</h3><form id="resolve-form"><div class="field"><label for="resolve-outcome">Finding</label><select id="resolve-outcome" name="outcome" required><option value="mutual_cancel">Cancellation · neither party at fault</option><option value="default_buyer">Buyer backed out</option><option value="default_seller">Seller backed out</option></select></div><div class="fee-preview" id="resolution-preview" aria-live="polite"></div><div class="field"><label for="resolve-reason">Decision and evidence reference</label><textarea id="resolve-reason" name="reason" required minlength="10" maxlength="1000" placeholder="Record the reason, agreement or evidence reference supporting this decision."></textarea></div><label class="consent-check"><input type="checkbox" required><span>I have reviewed the evidence and notified the parties. This final allocation cannot be edited.</span></label><button class="btn btn-black" type="submit">Confirm final settlement</button></form></section>`;
}
function previewResolution(outcome,balances) {
  const b=balances.buyer,s=balances.seller;
  if(outcome==='mutual_cancel')return `Full refunds — buyer: ${amount(b.depositReceived+b.servicePaid)}; seller: ${amount(s.depositReceived+s.servicePaid)}. AuctionHouse retains no service charge.`;
  const defaulting=outcome==='default_buyer'?'buyer':'seller',affected=defaulting==='buyer'?'seller':'buyer',d=balances[defaulting],a=balances[affected],comp=Math.floor(d.depositReceived/2);
  return `${label(affected)} gets their own ${amount(a.depositReceived+a.servicePaid)} back, plus ${amount(comp)} compensation. AuctionHouse retains ${amount(d.depositReceived-comp)}. ${label(defaulting)} receives ${amount(d.servicePaid)} in unused service payments back.`;
}
function payoutForm() {
  return `<section class="panel"><div class="eyebrow">[ PAYOUT DESK ]</div><h3>Record a completed payout.</h3><p>Record money already returned or paid. This form does not send money.</p><form id="payout-form"><div class="field"><label for="payout-party">Paid to</label><select id="payout-party" name="party"><option value="buyer">Buyer</option><option value="seller">Seller</option></select></div><div class="field"><label for="payout-method">Paid by</label><select id="payout-method" name="method"><option value="cash">Cash</option><option value="bank_transfer">Completed bank transfer</option></select></div>${field('amount','Amount paid (PKR)','type="number" min="0.01" step="0.01" required')}${field('reference','Unique payout receipt / transfer reference','required minlength="3" maxlength="100"')}<label class="consent-check"><input type="checkbox" required><span>I confirm the beneficiary received this money.</span></label><button class="btn btn-black" type="submit">Record payout ↗</button></form></section>`;
}
function payoutHistory(ctx,items) {
  return items.length?`<ol class="audit-list">${items.map(item=>`<li><strong>${label(item.party)} · ${amount(item.amount)}</strong><small>${ctx.esc(item.reference)} · ${item.method==='cash'?'Cash':'Bank transfer'} · ${when(item.paid_at)}</small></li>`).join('')}</ol>`:'<p>No completed payouts recorded yet.</p>';
}
