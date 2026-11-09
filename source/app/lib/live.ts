import {response} from './platform';
export async function live(_req:Request){return response({error:'Use a WebSocket connection for live updates.'},426)}
