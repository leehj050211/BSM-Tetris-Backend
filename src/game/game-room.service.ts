import { Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { v4 as getUUID } from 'uuid';
import { Room } from 'src/game/types/room';
import { Player } from 'src/game/types/player';
import { GamePlayService } from 'src/game/game-play.service';
import { setTimeout } from 'timers/promises';
import { RoomDto } from 'src/game/dto/RoomDto';

@Injectable()
export class GameRoomService {
    constructor(private gamePlayService: GamePlayService) {
        this.gamePlayService.init(this.rooms);
    }
    
    private readonly MAX_PLAYERS = 8;
    private rooms: {
        [index: string]: Room
    } = {};
    // 방 생성 횟수 누적
    private totalRoomCount: number = 0;

    async findRoom(server: Server, client: Socket, player: Player) {
        let isFind: boolean = false;
        let room: Room;
        // 사용 가능한 방 찾기
        for (let i=0; i<Object.keys(this.rooms).length; i++) {
            room = this.rooms[Object.keys(this.rooms)[i]];
            if (Object.keys(room.players).length < this.MAX_PLAYERS) {
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
        await setTimeout(100);

        // 이미 플레이중인 방이라면
        if (room.init) {
            this.gamePlayService.joinPlayer(room, client);
            return;
        }

        // 유저가 방에 전부 들어왔으면 게임 준비
        if (Object.keys(room.players).length == this.MAX_PLAYERS) {
            room.init = true;
            server.to(room.id).emit('game:ready', 'ready');
            this.gamePlayService.initGame(server, room);
        }
    }

    exitRoom(client: Socket, player: Player) {
        const room: Room = this.rooms[player.roomId];
        client.broadcast.to(room.id).emit('player:exit', player.username);
        this.gamePlayService.deletePlayer(room, player);
    }

    getRoomInfo(client: Socket, player: Player) {
        const room: Room = this.rooms[player.roomId];
        client.emit('room:info', {
            roomId: room.id,
            init: room.init,
            players: Object.keys(room.players),
            maxPlayers: this.MAX_PLAYERS
        });
    }

    roomSkipWait(server: Server, player: Player) {
        const room: Room = this.rooms[player.roomId];
        if (room.init) return;
        room.init = true;
        server.to(room.id).emit('room:skip', 'skip');
        this.gamePlayService.initGame(server, room);
    }

    getRoomList(): RoomDto[] {
        return Object.values(this.rooms).map(room => {
            const roomDto = new RoomDto;
            roomDto.id = room.id;
            roomDto.name = room.name;
            roomDto.isPlaying = room.playing;
            roomDto.maxPlayers = this.MAX_PLAYERS;
            roomDto.totalPlayers = Object.keys(room.players).length;

            return roomDto;
        });
    }

    private createRoom(name: string = `방 ${String(++this.totalRoomCount).padStart(4, '0')}`): Room {
        const newRoom = new Room();
        newRoom.name = name;
        newRoom.id = getUUID().replaceAll('-', '');
        newRoom.players = {};
        return newRoom;
    }
}