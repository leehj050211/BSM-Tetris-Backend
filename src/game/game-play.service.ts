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
            const prevBoard = gameRoom.board[user.clientId];
            const tempBoard = this.copyBoard(prevBoard);
            // 새로운 조각 생성
            const piece = this.spawnPiece(gameRoom, user);
            this.renderPiece(tempBoard, piece);
            
            this.server.to(roomId).emit('game:spawn', {
                nickname: user.nickname,
                board: tempBoard,
                tick: room.tick
            });
        })

        room.users.forEach(user => {
            const prevBoard = gameRoom.board[user.clientId];
            const tempBoard = this.copyBoard(prevBoard);
            const piece = gameRoom.piece[user.clientId];
            const stat = this.naturalDrop(tempBoard, piece);
            
            console.table(tempBoard);
            console.table(piece.shape)
            this.server.to(roomId).emit('game:softdrop', {
                nickname: user.nickname,
                board: tempBoard,
                tick: room.tick
            });

            if (!stat) {
                gameRoom.board[user.clientId] = tempBoard;
                delete gameRoom.piece[user.clientId];
            }
        })

        room.tick++;
    }

    gameControl(user: User, action: string, data: any) {
        const roomId = user.roomId;
        const gameRoom: Game = this.gameRooms[roomId];
        const prevBoard = gameRoom.board[user.clientId];
        switch (action) {
            case 'move': {
                const tempBoard = this.copyBoard(prevBoard);
                const piece = gameRoom.piece[user.clientId];
                // 생성된 조각이 없다면
                if (!piece) {
                    return;
                }
                switch (data) {
                    case 'down': {
                        piece.y++;
                        break;
                    }
                    case 'left': {
                        piece.x--;
                        break;
                    }
                    case 'right': {
                        piece.x++;
                        break;
                    }
                    // 없는 동작이면 캔슬
                    default: {
                        return;
                    }
                }
                // 조각이 블록에 막혀있다면 캔슬
                if (!this.voidCheck(tempBoard, piece).flag) {
                    switch (data) {
                        case 'down': {
                            piece.y--;
                            break;
                        }
                        case 'left': {
                            piece.x++;
                            break;
                        }
                        case 'right': {
                            piece.x--;
                            break;
                        }
                    }
                    return;
                }
                this.renderPiece(tempBoard, piece);
                this.server.to(roomId).emit('game:softdrop', {
                    nickname: user.nickname,
                    board: tempBoard
                });
            }
        }
    }

    private spawnPiece(gameRoom: Game, user: User): Piece {
        const piece = new Piece();
        gameRoom.piece[user.clientId] = piece;
        return piece;
    }

    private naturalDrop(board: number[][], piece: Piece): boolean {
        piece.y++;
        // 만약 false라면 블록이 땅이나 다른 블록까지 떨어진 상태
        if (!this.voidCheck(board, piece).down) {
            piece.y--;
            if (piece.y < -1) {
                return;
            }
            for (let i=piece.y; i < (piece.y + piece.shape.length); i++) {
                for (let j=piece.x; j < (piece.x + piece.shape[0].length); j++) {
                    if (piece.shape[i-piece.y][j-piece.x] != 0) {
                        if (i < 0) {
                            continue;
                        }
                        board[i][j] = piece.id;
                    }
                }
            }
            return false;
        }
        // 아니면 계속 진행
        this.renderPiece(board, piece);
        return true;
    }

    private renderPiece(board: number[][], piece: Piece) {
        for (let i=piece.y; (i-piece.y < (piece.shape.length) && i<this.BOARD_COLS); i++) {
            for (let j=piece.x; (j-piece.x < (piece.shape[0].length) && j<this.BOARD_ROWS); j++) {
                // 블록이 보드 한 칸 위에서 내려오는 중이라면
                if (i < 0) {
                    continue;
                }
                if (piece.shape[i-piece.y][j-piece.x] != 0) {
                    board[i][j] = piece.id;
                }
            }
        }
    }

    private voidCheck(board: number[][], piece: Piece): {
        flag: boolean,
        down: boolean,
        left: boolean,
        right: boolean
    } {
        const result = {
            flag: true,
            down: true,
            left: true,
            right: true
        }
        for (let i=piece.y; i < (piece.y + piece.shape.length); i++) {
            for (let j=piece.x; j < (piece.x + piece.shape[0].length); j++) {
                // 보드 바깥을 넘어가는지 체크
                if (i >= this.BOARD_COLS) {
                    result.down = false;
                    result.flag = false;
                }
                if (j < 0 ) {
                    result.left = false;
                    result.flag = false;
                }
                if (j >= this.BOARD_ROWS) {
                    result.right = false;
                    result.flag = false;
                }
                if (!result.flag) {
                    return result;
                }
                // 블록이 보드 한 칸 위에서 내려오는 중이라면
                if (i < 0) {
                    continue;
                }
                // 블록들 끼리 충돌하는지 체크
                if (piece.shape[i-piece.y][j-piece.x] != 0 && board[i][j] != 0) {
                    result.down = false;
                    result.left = false;
                    result.right = false;
                    result.flag = false;
                    return result;
                }
            }
        }
        return result;
    }

    // 깊은 복사
    private copyBoard(board: number[][]): number[][] {
        return board.map(rows => [...rows]);
    }
}