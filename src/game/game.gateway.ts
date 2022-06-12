import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { plainToClass } from '@nestjs/class-transformer';
import { User } from 'src/game/types/user';
import { GameRoomService } from 'src/game/game-room.service';

@WebSocketGateway({
    cors: true,
    transports: ['websocket']
})

export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
    constructor(
        private gameRoomService: GameRoomService
    ) {}

    @WebSocketServer()
    server: Server;

    private users: {
        [index: string]: User
    } = {};

    private clients: {
        [index: string]: Socket
    } = {};

    async handleConnection(client: Socket) {
        this.clients[client.id] = client;
        console.log('client connected. clientID: ', client.id);
    }

    async handleDisconnect(client: Socket) {
        if (this.users[client.id]?.roomId) {
            this.gameRoomService.exitRoom(client, this.users[client.id]);
            delete this.users[client.id];
        }
        delete this.clients[client.id];
        console.log('client disconnected. clientID: ', client.id);
    }

    @SubscribeMessage('join')
    async join(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: object
    ) {
        if (this.users[client.id]) {
            return client.emit('error', 'Already joined the game');
        }

        this.users[client.id] = plainToClass(User, {
            ...data,
            clientId: client.id
        }, {
            excludeExtraneousValues: true
        });

        this.users[client.id] = this.gameRoomService.findRoom(client, this.users[client.id]);
    }

    @SubscribeMessage('get users')
    async getUsers(client: Socket) {
        const userNameList = Object.keys(this.users).map(clientId => this.users[clientId].nickname);
        client.emit('get users', userNameList);
    }
}