declare namespace Cloudflare {
 interface Env { DB?: D1Database; BUCKET?: R2Bucket; PII_ENCRYPTION_KEY?: string; GOOGLE_CLIENT_ID?: string; GOOGLE_CLIENT_SECRET?: string; RESEND_API_KEY?: string; EMAIL_FROM?: string; SITE_ORIGIN?: string; ADMIN_ACCOUNT_IDS?: string; }
}
