import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { plainToClass } from '@nestjs/class-transformer';
import { Player } from 'src/game/types/player';
import { GameRoomService } from 'src/game/game-room.service';
import { GamePlayService } from 'src/game/game-play.service';
import { WSAuthUtil } from 'src/auth/WS-auth.util';
import { User } from 'src/user/user';

@WebSocketGateway({
    cors: true,
    transports: ['websocket']
})

export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
    constructor(
        private gameRoomService: GameRoomService,
        private gamePlayService: GamePlayService,
        private wsAuthUtil: WSAuthUtil
    ) {}

    @WebSocketServer()
    server: Server;

    private players: {
        [index: string]: Player
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
        const player: Player = this.players[username];
        if (player.roomId) {
            this.gameRoomService.exitRoom(client, player);
            delete this.players[username];
        }
        delete this.clients[client.id];
        console.log('client disconnected. clientID: ', client.id);
    }

    @SubscribeMessage('join')
    async join(
        @ConnectedSocket() client: Socket,
        @MessageBody('username') username: string
    ) {
        const user: User | null = await this.wsAuthUtil.authClient(client);
        if (user !== null) {
            username = user.nickname;
        }
        if (this.clients[client.id].username !== undefined) {
            return client.emit('error', 'Already joined the game');
        }
        if (this.players[username] !== undefined) {
            return client.emit('error', 'Existing username');
        }
        const newPlayer: Player = plainToClass(Player, {
            username,
            clientId: client.id
        }, {
            excludeExtraneousValues: true
        });
        if (user) newPlayer.user = user;

        this.players[username] = newPlayer;
        this.clients[client.id].username = username;
        this.gameRoomService.findRoom(this.server, client, newPlayer);
    }

    @SubscribeMessage('getPlayers')
    async getPlayers(client: Socket) {
        const playerNameList = Object.keys(this.players);
        client.emit('get players', playerNameList);
    }

    @SubscribeMessage('room:info')
    async getRoomInfo(@ConnectedSocket() client: Socket) {
        if (this.clients[client.id].username === undefined) {
            return client.emit('error', `You didn't joined the game`);
        }
        const username = this.clients[client.id].username;
        const player: Player = this.players[username];
        if (!player.roomId) {
            return client.emit('error', `You didn't joined the game`);
        }
        this.gameRoomService.getRoomInfo(client, player);
    }

    @SubscribeMessage('room:skip')
    async roomSkipWait(@ConnectedSocket() client: Socket) {
        if (this.clients[client.id].username === undefined) {
            return client.emit('error', `You didn't joined the game`);
        }
        const username = this.clients[client.id].username;
        const player: Player = this.players[username];
        if (!player.roomId) {
            return client.emit('error', `You didn't joined the game`);
        }
        this.gameRoomService.roomSkipWait(this.server, player);
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
        const player: Player = this.players[username];
        if (!player.roomId) {
            return client.emit('error', `You didn't joined the game`);
        }
        this.gamePlayService.gameControl(player, action, data);
    }
}