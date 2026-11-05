import { sqliteTable, text, integer, index, check } from 'drizzle-orm/sqlite-core';
import {sql} from 'drizzle-orm';
export const accounts = sqliteTable('accounts', {
 id: text('id').primaryKey(), email: text('email').notNull().unique(), fullName: text('full_name').notNull(), fatherName: text('father_name'),
 cnicEncrypted: text('cnic_encrypted'), cnicFingerprint: text('cnic_fingerprint').unique(), addressEncrypted: text('address_encrypted'), phone: text('phone'),
 passwordHash: text('password_hash'), googleSub: text('google_sub').unique(), emailVerified: integer('email_verified').notNull().default(0),
 profileComplete: integer('profile_complete').notNull().default(0), createdAt: integer('created_at').notNull(), updatedAt: integer('updated_at').notNull()
});
export const sessions = sqliteTable('account_sessions', {tokenHash:text('token_hash').primaryKey(),accountId:text('account_id').notNull().references(()=>accounts.id),expiresAt:integer('expires_at').notNull()});
export const tokens = sqliteTable('account_tokens', {tokenHash:text('token_hash').primaryKey(),accountId:text('account_id').notNull().references(()=>accounts.id),purpose:text('purpose').notNull(),expiresAt:integer('expires_at').notNull()});
export const rateLimits = sqliteTable('rate_limits', {key:text('key').primaryKey(),count:integer('count').notNull(),expiresAt:integer('expires_at').notNull()});
export const interests = sqliteTable('interests', {id:text('id').primaryKey(),accountId:text('account_id').notNull().references(()=>accounts.id),role:text('role').notNull(),project:text('project').notNull(),category:text('category').notNull(),budget:integer('budget'),premium:integer('premium'),allotment:text('allotment'),notes:text('notes'),createdAt:integer('created_at').notNull()});

export const deals = sqliteTable('deals', {
 id:text('id').primaryKey(), title:text('title').notNull(),
 buyerId:text('buyer_id').notNull().references(()=>accounts.id), sellerId:text('seller_id').notNull().references(()=>accounts.id),
 salePrice:integer('sale_price').notNull(), buyerRateBps:integer('buyer_rate_bps').notNull(), sellerRateBps:integer('seller_rate_bps').notNull(),
 buyerDeposit:integer('buyer_deposit').notNull(), sellerDeposit:integer('seller_deposit').notNull(), terms:text('terms').notNull(),
 buyerAcceptedAt:integer('buyer_accepted_at'), sellerAcceptedAt:integer('seller_accepted_at'),
 status:text('status').notNull().default('awaiting_deposits'), createdBy:text('created_by').notNull().references(()=>accounts.id),
 createdAt:integer('created_at').notNull(), updatedAt:integer('updated_at').notNull(),
},t=>[
 index('deals_buyer').on(t.buyerId,t.createdAt),index('deals_seller').on(t.sellerId,t.createdAt),
 check('deal_price_range',sql`${t.salePrice} > 0 AND ${t.salePrice} <= 100000000000000`),
 check('buyer_rate_range',sql`${t.buyerRateBps} BETWEEN 50 AND 200`),check('seller_rate_range',sql`${t.sellerRateBps} BETWEEN 50 AND 200`),
 check('buyer_deposit_range',sql`${t.buyerDeposit} > 0 AND ${t.buyerDeposit} <= 100000000000000`),
 check('seller_deposit_range',sql`${t.sellerDeposit} > 0 AND ${t.sellerDeposit} <= 100000000000000`),
 check('deal_parties_different',sql`${t.buyerId} <> ${t.sellerId}`),
 check('deal_status_values',sql`${t.status} IN ('awaiting_deposits','active','completed','disputed','cancelled','defaulted')`),
]);
export const dealPayments = sqliteTable('deal_payments', {
 id:text('id').primaryKey(),dealId:text('deal_id').notNull().references(()=>deals.id),party:text('party').notNull(),purpose:text('purpose').notNull(),
 amount:integer('amount').notNull(),method:text('method').notNull(),reference:text('reference').notNull().unique(),status:text('status').notNull().default('received'),
 recordedBy:text('recorded_by').notNull().references(()=>accounts.id), receivedAt:integer('received_at').notNull(),
 voidedBy:text('voided_by').references(()=>accounts.id),voidReason:text('void_reason'),voidedAt:integer('voided_at'),
},t=>[
 index('deal_payments_deal').on(t.dealId),check('payment_party_values',sql`${t.party} IN ('buyer','seller')`),
 check('payment_purpose_values',sql`${t.purpose} IN ('participation','service')`),check('payment_amount_range',sql`${t.amount} > 0 AND ${t.amount} <= 100000000000000`),
 check('payment_method_values',sql`${t.method} = 'cash'`),check('payment_status_values',sql`${t.status} IN ('received','voided')`),
]);
export const dealAudit = sqliteTable('deal_audit', {
 id:text('id').primaryKey(),dealId:text('deal_id').notNull().references(()=>deals.id),actorId:text('actor_id').notNull().references(()=>accounts.id),
 action:text('action').notNull(),details:text('details').notNull(),createdAt:integer('created_at').notNull(),
},t=>[index('deal_audit_deal').on(t.dealId,t.createdAt)]);
export const dealSettlements = sqliteTable('deal_settlements', {
 dealId:text('deal_id').primaryKey().references(()=>deals.id),kind:text('kind').notNull(),
 buyerRefund:integer('buyer_refund').notNull(),sellerRefund:integer('seller_refund').notNull(),
 buyerCompensation:integer('buyer_compensation').notNull(),sellerCompensation:integer('seller_compensation').notNull(),
 platformRetained:integer('platform_retained').notNull(),totalReceived:integer('total_received').notNull(),
 reason:text('reason').notNull(),decidedBy:text('decided_by').notNull().references(()=>accounts.id),createdAt:integer('created_at').notNull(),
},t=>[
 check('settlement_kind_values',sql`${t.kind} IN ('completed','default_buyer','default_seller','mutual_cancel')`),
 check('buyer_refund_positive',sql`${t.buyerRefund} >= 0`),check('seller_refund_positive',sql`${t.sellerRefund} >= 0`),
 check('buyer_compensation_positive',sql`${t.buyerCompensation} >= 0`),check('seller_compensation_positive',sql`${t.sellerCompensation} >= 0`),
 check('platform_retained_positive',sql`${t.platformRetained} >= 0`),
 check('settlement_conservation',sql`${t.buyerRefund}+${t.sellerRefund}+${t.buyerCompensation}+${t.sellerCompensation}+${t.platformRetained}=${t.totalReceived}`),
]);
export const dealDisbursements=sqliteTable('deal_disbursements',{
 id:text('id').primaryKey(),dealId:text('deal_id').notNull().references(()=>dealSettlements.dealId),party:text('party').notNull(),amount:integer('amount').notNull(),
 method:text('method').notNull(),reference:text('reference').notNull().unique(),recordedBy:text('recorded_by').notNull().references(()=>accounts.id),paidAt:integer('paid_at').notNull(),
},t=>[
 index('deal_disbursements_deal').on(t.dealId),check('disbursement_party_values',sql`${t.party} IN ('buyer','seller')`),
 check('disbursement_amount_range',sql`${t.amount} > 0 AND ${t.amount} <= 100000000000000`),check('disbursement_method_values',sql`${t.method} IN ('cash','bank_transfer')`),
]);
