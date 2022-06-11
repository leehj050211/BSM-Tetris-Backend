import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
    cors: true,
    transports: ['websocket']
})

export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {

    @WebSocketServer()
    server: Server;

    users: {
        [index: string]: {
            clientId: string,
            nickname: string
        }
    } = {};

    clients: {
        [index: string]: Socket
    } = {};

    async handleConnection(client: Socket): Promise<void> {
        this.clients[client.id] = client;
        console.log('client connected', client.id);
    }

    async handleDisconnect(client: Socket): Promise<void> {
        this.clients[client.id] = null;
        console.log('client disconnected', client.id);
    }
}