import { Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { v4 as getUUID } from 'uuid';
import { Room } from 'src/game/types/room';
import { User } from 'src/game/types/user';

@Injectable()
export class GameRoomService {
    private readonly MAX_PLAYERS = 4;
    private rooms: {
        [index: string]: Room
    } = {};

    findRoom(client: Socket, user: User): User {
        let roomId: string;
        let isFind: boolean = false;
        // 사용 가능한 방 찾기
        for (let i=0; i<Object.keys(this.rooms).length; i++) {
            const key = Object.keys(this.rooms)[i];
            if (this.rooms[key].users.length < this.MAX_PLAYERS) {
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
        client.emit('join', roomId);
        client.broadcast.to(roomId).emit('user join', `${user.nickname} join the game`);
        return user;
    }

    exitRoom(client: Socket, user: User) {
        client.broadcast.to(user.roomId).emit('user exit', `${user.nickname} left the game`);
        this.rooms[user.roomId].users = this.rooms[user.roomId].users.filter(user => user.clientId != user.clientId);
    }

    private createRoom(): Room {
        const newRoom = new Room();
        newRoom.id = getUUID().replaceAll('-', '');
        newRoom.users = [];
        return newRoom;
    }
}