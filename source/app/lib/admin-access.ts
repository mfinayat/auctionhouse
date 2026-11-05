import {env} from 'cloudflare:workers';

// Account IDs are provisioned by the operator, never by registration/profile input.
export function isAdmin(account: {id: string} | null | undefined): boolean {
  return !!account && (env.ADMIN_ACCOUNT_IDS || '').split(',').map(id => id.trim()).filter(Boolean).includes(account.id);
}
