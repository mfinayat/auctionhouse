import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
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
