import { Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { v4 as getUUID } from 'uuid';
import { Room } from 'src/game/types/room';
import { User } from 'src/game/types/user';
import { GamePlayService } from 'src/game/game-play.service';

@Injectable()
export class GameRoomService {
    constructor(private gamePlayService: GamePlayService) {}
    
    private readonly MAX_PLAYERS = 2;
    private rooms: {
        [index: string]: Room
    } = {};

    findRoom(server: Server, client: Socket, user: User): User {
        let roomId: string;
        let isFind: boolean = false;
        // 사용 가능한 방 찾기
        for (let i=0; i<Object.keys(this.rooms).length; i++) {
            const key = Object.keys(this.rooms)[i];
            if (!this.rooms[key].playing && this.rooms[key].users.length < this.MAX_PLAYERS) {
                this.rooms[key].users.push(user);
                roomId = this.rooms[key].id;
                isFind = true;
            }
        }
        // 사용 가능한 방이 없으면
        if (!isFind) {
            const newRoom = this.createRoom();
            newRoom.users.push(user);
            this.rooms[newRoom.id] = newRoom;
            roomId = newRoom.id;
            isFind = true;
        }

        client.join(roomId);
        user.roomId = roomId;
        console.log(this.rooms[roomId].users)

        client.emit('join', {
            roomId,
            users: this.rooms[roomId].users.map(user => user.nickname)
        });
        client.broadcast.to(roomId).emit('user:join', user.nickname);
        if (this.rooms[user.roomId].users.length == this.MAX_PLAYERS) {
            this.rooms[roomId].playing = true;
            server.to(roomId).emit('game:ready', 'ready');
            this.gamePlayService.initGame(server, this.rooms[roomId]);
        }
        return user;
    }

    exitRoom(client: Socket, user: User) {
        client.broadcast.to(user.roomId).emit('user:exit', user.nickname);
        this.rooms[user.roomId].users = this.rooms[user.roomId].users.filter(user => user.clientId != user.clientId);
    }

    private createRoom(): Room {
        const newRoom = new Room();
        newRoom.id = getUUID().replaceAll('-', '');
        newRoom.users = [];
        return newRoom;
    }
}