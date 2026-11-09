export const securityHeaders={
 'X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','X-Frame-Options':'DENY',
 'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' wss://auctionhouse.pk; frame-src https://www.google.com https://maps.google.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
 'Permissions-Policy':'camera=(), microphone=(), geolocation=()','Strict-Transport-Security':'max-age=31536000'
};
export function secure(response:Response){if(response.status===101)return response;const headers=new Headers(response.headers);for(const [key,value]of Object.entries(securityHeaders)){if(key==='Content-Security-Policy'&&headers.has(key))headers.append(key,value);else headers.set(key,value)};return new Response(response.body,{status:response.status,statusText:response.statusText,headers})}
