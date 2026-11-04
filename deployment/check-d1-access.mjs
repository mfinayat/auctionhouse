import fs from 'node:fs';

// Only checks access and executes SELECT 1. Never prints credentials or API bodies.
export async function checkD1Access({env = process.env, config, request = fetch, log = console.log}) {
  const account = env.CLOUDFLARE_ACCOUNT_ID;
  const token = env.CLOUDFLARE_API_TOKEN;
  if (!/^[a-f0-9]{32}$/i.test(account || '')) {
    throw new Error('CLOUDFLARE_ACCOUNT_ID must be the 32-character account ID, with no spaces or quotes. Update it in GitHub Settings > Environments > production.');
  }
  if (!token || token !== token.trim()) {
    throw new Error('CLOUDFLARE_API_TOKEN is missing or contains surrounding whitespace. Update the production environment secret.');
  }
  const db = config.d1_databases?.find(item => item.binding === 'DB');
  if (!db?.database_id) throw new Error('No DB database_id in packaged wrangler.json.');
  const base = `https://api.cloudflare.com/client/v4/accounts/${account}/d1/database`;
  async function call(url, options = {}) {
    const response = await request(url, {
      ...options,
      headers: {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'},
      signal: AbortSignal.timeout(30000),
    });
    const body = await response.json();
    if (!response.ok || body.success !== true) {
      const codes = (body.errors || []).map(error => Number(error.code)).filter(Number.isFinite);
      throw new Error(`HTTP ${response.status}; Cloudflare error codes: ${codes.join(', ') || 'none'}`);
    }
    return body.result;
  }
  try {
    await call(`${base}?per_page=1`);
    log('PASS: token can list D1 databases in the configured account.');
  } catch (error) {
    throw new Error(`D1 account access failed (${error.message}). The token cannot list D1 in this account. Check the production environment account ID, token account scope, expiry and D1 permission. Repository secrets with the same names do not override production environment secrets.`);
  }
  try {
    const details = await call(`${base}/${encodeURIComponent(db.database_id)}`);
    if (details.name !== db.database_name) throw new Error('Database name differs from configuration');
    log('PASS: configured database ID and name match an accessible database.');
  } catch (error) {
    throw new Error(`D1 database lookup failed (${error.message}). Account-level D1 listing worked. Check the database ID/name in source/wrangler.jsonc and any database resource restrictions on the token.`);
  }
  try {
    const results = await call(`${base}/${encodeURIComponent(db.database_id)}/query`, {
      method: 'POST', body: JSON.stringify({sql: 'SELECT 1 AS ci_access_check', params: []}),
    });
    if (!Array.isArray(results) || results.some(result => !result.success)) {
      throw new Error('Query did not succeed');
    }
    log('PASS: read-only D1 query succeeded. Migrations also require D1 Write/Edit permission.');
  } catch (error) {
    throw new Error(`D1 query access failed (${error.message}). Account and database lookup worked, but the query endpoint rejected access. Confirm D1 Write/Edit on this account for migrations.`);
  }
}

if (process.argv[1] && import.meta.url === (await import('node:url')).pathToFileURL(process.argv[1]).href) {
  try {
    await checkD1Access({config: JSON.parse(fs.readFileSync(new URL('./wrangler.json', import.meta.url), 'utf8'))});
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
