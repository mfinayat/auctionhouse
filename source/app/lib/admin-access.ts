import {env} from 'cloudflare:workers';

// Account IDs are provisioned by the operator, never by registration/profile input.
export function isAdmin(account: {id: string;_staffRole?:string} | null | undefined): boolean {
  // Customer sessions, including legacy ADMIN_ACCOUNT_IDS, never grant staff access.
  return !!account?._staffRole && ['owner','finance'].includes(account._staffRole);
}
