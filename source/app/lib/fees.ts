// All stored amounts are integer paisa; all rates are integer basis points.
export const MAX_MONEY = 100_000_000_000_000;

export function money(value: unknown, label = 'Amount'): number {
  if (typeof value !== 'string' || !/^(0|[1-9]\d{0,12})(\.\d{1,2})?$/.test(value)) {
    throw new Error(`${label} must be a positive PKR amount with at most two decimal places.`);
  }
  const [whole, fraction = ''] = value.split('.');
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(result) || result < 0 || result > MAX_MONEY) throw new Error(`${label} is outside the supported range.`);
  return result;
}

export function fee(price: number, basisPoints: number): number {
  if (!Number.isSafeInteger(price) || price < 0 || price > MAX_MONEY || !Number.isInteger(basisPoints) || basisPoints < 50 || basisPoints > 200) {
    throw new Error('Service charge must be between 0.50% and 2.00%, in steps of 0.01%.');
  }
  return Number((BigInt(price) * BigInt(basisPoints) + BigInt(5000)) / BigInt(10000));
}

export const FINANCIAL_POLICY = `Refundable Token Money guarantee the deal. On a successful sale, each party's deposit is credited towards their own service charge; any excess is refundable. On cancellation without either party being at fault, both parties receive their full payments back. If one party defaults, the affected party receives their own deposit back plus 50% of the defaulting party's received Refundable Token Money. AuctionHouse retains the other 50%. Additional service payments are returned when a sale does not complete. An odd paisa in the 50/50 split goes to AuctionHouse. A default decision follows administrator review; refunds and compensation are recorded separately from the decision.`;

export type SettlementKind = 'completed' | 'default_buyer' | 'default_seller' | 'mutual_cancel';
export function settlement(kind: SettlementKind, price: number, buyerRate: number, sellerRate: number, totals: {buyer:{participation:number;service:number};seller:{participation:number;service:number}}) {
  const b=totals.buyer, s=totals.seller;
  const result={buyerRefund:0,sellerRefund:0,buyerCompensation:0,sellerCompensation:0,platformRetained:0,totalReceived:b.participation+b.service+s.participation+s.service};
  if(kind==='completed') {
    const buyerCharge=fee(price,buyerRate), sellerCharge=fee(price,sellerRate);
    if(b.participation+b.service<buyerCharge || s.participation+s.service<sellerCharge) throw new Error('Service charges must be paid before completion.');
    result.buyerRefund=b.participation+b.service-buyerCharge;
    result.sellerRefund=s.participation+s.service-sellerCharge;
    result.platformRetained=buyerCharge+sellerCharge;
  } else if(kind==='mutual_cancel') {
    result.buyerRefund=b.participation+b.service; result.sellerRefund=s.participation+s.service;
  } else if(kind==='default_buyer') {
    result.buyerRefund=b.service;result.sellerRefund=s.participation+s.service;
    result.sellerCompensation=Math.floor(b.participation/2);
    result.platformRetained=b.participation-result.sellerCompensation;
  } else if(kind==='default_seller') {
    result.sellerRefund=s.service;result.buyerRefund=b.participation+b.service;
    result.buyerCompensation=Math.floor(s.participation/2);
    result.platformRetained=s.participation-result.buyerCompensation;
  } else throw new Error('Choose a valid settlement outcome.');
  return result;
}

export function partyBalance(price: number, basisPoints: number, participation: number, servicePaid: number) {
  const serviceCharge = fee(price, basisPoints);
  const depositCredit = Math.min(participation, serviceCharge);
  return {
    serviceCharge,
    depositCredit,
    servicePaid,
    remaining: Math.max(0, serviceCharge - depositCredit - servicePaid),
    refundable: Math.max(0, participation + servicePaid - serviceCharge),
  };
}
