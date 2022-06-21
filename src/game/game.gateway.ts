import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { plainToClass } from '@nestjs/class-transformer';
import { User } from 'src/game/types/user';
import { GameRoomService } from 'src/game/game-room.service';
import { GamePlayService } from 'src/game/game-play.service';

@WebSocketGateway({
    cors: true,
    transports: ['websocket']
})

export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
    constructor(
        private gameRoomService: GameRoomService,
        private gamePlayService: GamePlayService
    ) {}

    @WebSocketServer()
    server: Server;

    private users: {
        [index: string]: User
    } = {};

    private clients: {
        [index: string]: {
            username?: string,
            socket: Socket
        }
    } = {};

    async handleConnection(client: Socket) {
        this.clients[client.id] = {
            socket: client
        };
        console.log('client connected. clientID: ', client.id);
    }

    async handleDisconnect(client: Socket) {
        if (this.clients[client.id].username === undefined) {
            return delete this.clients[client.id];
        }
        const username = this.clients[client.id].username;
        const user: User = this.users[username];
        if (user.roomId) {
            this.gameRoomService.exitRoom(client, user);
            delete this.users[username];
        }
        delete this.clients[client.id];
        console.log('client disconnected. clientID: ', client.id);
    }

    @SubscribeMessage('join')
    async join(
        @ConnectedSocket() client: Socket,
        @MessageBody('username') username: string
    ) {
        if (this.clients[client.id].username !== undefined) {
            return client.emit('error', 'Already joined the game');
        }
        if (this.users[username] !== undefined) {
            return client.emit('error', 'Existing username');
        }
        const newUser: User = plainToClass(User, {
            username,
            clientId: client.id
        }, {
            excludeExtraneousValues: true
        });

        this.users[username] = newUser;
        this.clients[client.id].username = username;
        this.gameRoomService.findRoom(this.server, client, newUser);
    }

    @SubscribeMessage('getUsers')
    async getUsers(client: Socket) {
        const userNameList = Object.keys(this.users);
        client.emit('get users', userNameList);
    }

    @SubscribeMessage('room:info')
    async getRoomInfo(@ConnectedSocket() client: Socket) {
        if (this.clients[client.id].username === undefined) {
            return client.emit('error', `You didn't joined the game`);
        }
        const username = this.clients[client.id].username;
        const user: User = this.users[username];
        if (!user.roomId) {
            return client.emit('error', `You didn't joined the game`);
        }
        this.gameRoomService.getRoomInfo(client, user);
    }

    @SubscribeMessage('game')
    async gamePacket(
        @ConnectedSocket() client: Socket,
        @MessageBody('action') action: string,
        @MessageBody('data') data: any,
    ) {
        if (this.clients[client.id].username === undefined) {
            return client.emit('error', `You didn't joined the game`);
        }
        const username = this.clients[client.id].username;
        const user: User = this.users[username];
        if (!user.roomId) {
            return client.emit('error', `You didn't joined the game`);
        }
        this.gamePlayService.gameControl(user, action, data);
    }
}