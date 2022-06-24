import { Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { v4 as getUUID } from 'uuid';
import { Room } from 'src/game/types/room';
import { User } from 'src/game/types/user';
import { GamePlayService } from 'src/game/game-play.service';

@Injectable()
export class GameRoomService {
    constructor(private gamePlayService: GamePlayService) {}
    
    private readonly MAX_PLAYERS = 3;
    private rooms: {
        [index: string]: Room
    } = {};

    findRoom(server: Server, client: Socket, user: User): User {
        let isFind: boolean = false;
        let room: Room;
        // 사용 가능한 방 찾기
        for (let i=0; i<Object.keys(this.rooms).length; i++) {
            room = this.rooms[Object.keys(this.rooms)[i]];
            if (!room.playing && Object.keys(room.users).length < this.MAX_PLAYERS) {
                room.users[user.username] = user;
                isFind = true;
            }
        }
        // 사용 가능한 방이 없으면
        if (!isFind) {
            const newRoom = this.createRoom();
            newRoom.users[user.username] = user;
            this.rooms[newRoom.id] = newRoom;
            room = newRoom;
            isFind = true;
        }

        client.join(room.id);
        user.roomId = room.id;

        client.broadcast.to(room.id).emit('room:user-join', user.username);
        client.emit('room:join');
        // 유저가 방에 전부 들어왔으면 게임 준비
        if (Object.keys(room.users).length == this.MAX_PLAYERS) {
            setTimeout(() => {
                server.to(room.id).emit('game:ready', 'ready');
                this.gamePlayService.initGame(server, room);
            }, 100);
        }
        return user;
    }

    exitRoom(client: Socket, user: User) {
        const room: Room = this.rooms[user.roomId];
        client.broadcast.to(room.id).emit('user:exit', user.username);
        delete room.users[user.username];
        if (!Object.keys(room.users).length) {
            clearInterval(room.interval);
        }
    }

    getRoomInfo(client: Socket, user: User) {
        const room: Room = this.rooms[user.roomId];
        client.emit('room:info', {
            roomId: room.id,
            users: Object.keys(room.users),
            maxUsers: this.MAX_PLAYERS
        });
    }

    private createRoom(): Room {
        const newRoom = new Room();
        newRoom.id = getUUID().replaceAll('-', '');
        newRoom.users = {};
        return newRoom;
    }
}