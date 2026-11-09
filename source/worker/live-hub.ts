// One hibernating broadcast object per listing or account. D1 remains authoritative.
import {DurableObject} from 'cloudflare:workers';
export class LiveHub extends DurableObject {
 async fetch(req:Request){if(new URL(req.url).pathname==='/publish'&&req.method==='POST'){const message=await req.text();for(const socket of this.ctx.getWebSockets())try{socket.send(message)}catch{socket.close(1011,'Reconnect')}return new Response(null,{status:204})}
  if(req.headers.get('Upgrade')?.toLowerCase()!=='websocket')return new Response('WebSocket required',{status:426});const tag=req.headers.get('X-AH-Connection')||'anonymous';if(this.ctx.getWebSockets(tag).length>=4||this.ctx.getWebSockets().length>=2000)return new Response('Too many live connections',{status:429});const pair=new WebSocketPair(),client=pair[0],server=pair[1];this.ctx.acceptWebSocket(server,[tag]);server.send(JSON.stringify({type:'refresh',initial:true}));return new Response(null,{status:101,webSocket:client});
 }
 webSocketMessage(socket:WebSocket,message:string|ArrayBuffer){if(message==='ping')socket.send('pong');else socket.close(1008,'Read-only connection')}
 webSocketClose(socket:WebSocket,code:number){socket.close(code,'Connection closed')}
 webSocketError(socket:WebSocket){socket.close(1011,'Reconnect')}
}
