import {currentAccount} from '../app/lib/accounts';
import handler from 'vinext/server/fetch-handler';
import {documentHTML} from '../app/site-shell';
import {publicPage,sitemap} from '../app/lib/public-pages';
import {deliverNotifications} from '../app/lib/notifications';
import {expired} from '../app/lib/auctions';
import {releaseEndedHolds} from '../app/lib/wallet';
import {liveSocket,publishChanges} from '../app/lib/live-push';
import {secure} from './security';
export {LiveHub} from './live-hub';
export default {
 async fetch(request:Request,env:Cloudflare.Env,ctx:ExecutionContext){const url=new URL(request.url),path=url.pathname,started=Date.now(),hub=(env as any).LIVE_HUB as DurableObjectNamespace|undefined;try{
  if(path==='/api/live'&&request.headers.get('Upgrade')?.toLowerCase()==='websocket'){if(!hub)return secure(new Response('Live updates are being configured.',{status:503}));return await liveSocket(request,hub)}
  if(request.method==='GET'&&path==='/robots.txt')return secure(new Response('User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /budapest-admin\nDisallow: /account\nDisallow: /sell\nDisallow: /notifications\nDisallow: /login\nDisallow: /register\nSitemap: '+url.origin+'/sitemap.xml\n',{headers:{'Content-Type':'text/plain','Cache-Control':'public,max-age=3600'}}));
  if(request.method==='GET'&&path==='/sitemap.xml')return secure(new Response(await sitemap(url.origin),{headers:{'Content-Type':'application/xml','Cache-Control':'public,max-age=60'}}));
  if(request.method==='GET'&&!path.startsWith('/api/')&&!/\.[a-zA-Z0-9]+$/.test(path)){const page=await publicPage(url);return secure(new Response(documentHTML(path.startsWith('/budapest-admin'),{...page,...(path.startsWith('/budapest-admin')?{title:'Administration | AuctionHouse.pk'}:{}),url:url.origin+path}),{status:page.status,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':page.public?'public,max-age=0,must-revalidate':'private,no-store',...(!page.public?{'X-Robots-Tag':'noindex,nofollow'}:{})}}))}
  const result=await handler.fetch(request,env,ctx);if(request.method==='POST'&&path.startsWith('/api/')&&result.ok){if(hub)ctx.waitUntil((async()=>{const actor=/^\/api\/(?:listings\/[^/]+\/(?:favorite|accept-terms)|auth\/settings)$/.test(path)?await currentAccount(request):null;await publishChanges(hub,started,path,actor?.id)})().catch(error=>console.error('Live broadcast failed',error)));ctx.waitUntil(deliverNotifications().catch(error=>console.error('Email delivery failed',error)))}return secure(result)
 }catch(error){return secure(Response.json({error:(error as Error).message||'Please try again.'},{status:(error as any).status||503,headers:{'Cache-Control':'no-store'}}))}},
 async scheduled(_event:ScheduledController,env:Cloudflare.Env,_ctx:ExecutionContext){const started=Date.now();try{await expired();await releaseEndedHolds();if((env as any).LIVE_HUB)await publishChanges((env as any).LIVE_HUB,started);await deliverNotifications()}catch(error){console.error('Scheduled maintenance failed',error);throw error}}
};
