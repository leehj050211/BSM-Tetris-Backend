import { Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { v4 as getUUID } from 'uuid';
import { Room } from 'src/game/types/room';
import { Player } from 'src/game/types/player';
import { GamePlayService } from 'src/game/game-play.service';

@Injectable()
export class GameRoomService {
    constructor(private gamePlayService: GamePlayService) {}
    
    private readonly MAX_PLAYERS = 3;
    private rooms: {
        [index: string]: Room
    } = {};

    findRoom(server: Server, client: Socket, player: Player): Player {
        let isFind: boolean = false;
        let room: Room;
        // 사용 가능한 방 찾기
        for (let i=0; i<Object.keys(this.rooms).length; i++) {
            room = this.rooms[Object.keys(this.rooms)[i]];
            if (!room.playing && Object.keys(room.players).length < this.MAX_PLAYERS) {
                room.players[player.username] = player;
                isFind = true;
            }
        }
        // 사용 가능한 방이 없으면
        if (!isFind) {
            const newRoom = this.createRoom();
            newRoom.players[player.username] = player;
            this.rooms[newRoom.id] = newRoom;
            room = newRoom;
            isFind = true;
        }

        client.join(room.id);
        player.roomId = room.id;

        client.broadcast.to(room.id).emit('room:player-join', player.username);
        client.emit('room:join', {username: player.username});
        // 유저가 방에 전부 들어왔으면 게임 준비
        if (Object.keys(room.players).length == this.MAX_PLAYERS) {
            setTimeout(() => {
                server.to(room.id).emit('game:ready', 'ready');
                this.gamePlayService.initGame(server, room);
            }, 100);
        }
        return player;
    }

    exitRoom(client: Socket, player: Player) {
        const room: Room = this.rooms[player.roomId];
        client.broadcast.to(room.id).emit('player:exit', player.username);
        delete room.players[player.username];
        if (!Object.keys(room.players).length) {
            clearInterval(room.interval);
        }
    }

    getRoomInfo(client: Socket, player: Player) {
        const room: Room = this.rooms[player.roomId];
        client.emit('room:info', {
            roomId: room.id,
            players: Object.keys(room.players),
            maxPlayers: this.MAX_PLAYERS
        });
    }

    private createRoom(): Room {
        const newRoom = new Room();
        newRoom.id = getUUID().replaceAll('-', '');
        newRoom.players = {};
        return newRoom;
    }
}