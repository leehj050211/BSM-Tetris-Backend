import { Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { Room } from 'src/game/types/room';
import { User } from 'src/game/types/user';
import { Game } from 'src/game/types/game';
import { Piece } from 'src/game/types/piece';

@Injectable()
export class GamePlayService {
    private server: Server;
    private BOARD_ROWS = 10;
    private BOARD_COLS = 20;
    private rooms: {
        [index: string]: Room
    } = {};

    private gameRooms: {
        [index: string]: Game
    } = {};

    initGame(server: Server, room: Room) {
        this.server = server;
        this.rooms[room.id] = room;
        const newGame = new Game();
        newGame.roomId = room.id;
        // 유저 수 만큼 테트리스 보드 배열 초기화
        room.users.forEach(user => {
            newGame.board[user.clientId] = Array.from(
                {length: this.BOARD_COLS}, () => Array.from(
                    {length: this.BOARD_ROWS}, () => 0
                )
            );
        });
        this.gameRooms[room.id] = newGame;

        setTimeout(() => {
            this.server.to(room.id).emit('game:info', {
                roomId: room.id,
                users: room.users.map(user => user.nickname)
            });
        }, 3000);
        setTimeout(() => {
            this.server.to(room.id).emit('game:start', 'start');
            setInterval(() => this.play(room.id), 1000);
        }, 5000);
    }

    play(roomId: string) {
        const room: Room = this.rooms[roomId];
        const gameRoom: Game = this.gameRooms[roomId];
        
        room.users.forEach(user => {
            // 이미 생성된 조각이 있다면
            if (gameRoom.piece[user.clientId]) {
                return;
            }

            const newBoard = this.copyBoard(gameRoom.board[user.clientId]);
            const piece = new Piece();
            gameRoom.piece[user.clientId] = piece;

            console.log(piece.shape)
            for (let i=piece.y; (i-piece.y < (piece.shape.length) && i<this.BOARD_COLS); i++) {
                for (let j=piece.x; (j-piece.x < (piece.shape[0].length) && j<this.BOARD_ROWS); j++) {
                    if (piece.shape[i-piece.y][j-piece.x] != 0) {
                        newBoard[i][j] = piece.id;
                    }
                }
            }
            this.server.to(roomId).emit('game:spawn', {
                nickname: user.nickname,
                board: newBoard,
                tick: room.tick
            });
        })

        room.users.forEach(user => {
            const prevBoard = gameRoom.board[user.clientId];
            const newBoard = this.copyBoard(prevBoard);
            const piece = gameRoom.piece[user.clientId];
            piece.y++;

            for (let i=piece.y; (i-piece.y < (piece.shape.length) && i<this.BOARD_COLS); i++) {
                for (let j=piece.x; (j-piece.x < (piece.shape[0].length) && j<this.BOARD_ROWS); j++) {
                    if (piece.shape[i-piece.y][j-piece.x] != 0) {
                        newBoard[i][j] = piece.id;
                    }
                }
            }
            this.server.to(roomId).emit('game:softdrop', {
                nickname: user.nickname,
                board: newBoard,
                tick: room.tick
            });
        })

        room.tick++;
    }

    private copyBoard(board: number[][]): number[][] {
        return board.map(rows => [...rows]);
    }
}