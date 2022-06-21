import { Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { Room } from 'src/game/types/room';
import { User } from 'src/game/types/user';
import { Piece } from 'src/game/types/piece';
import { GameData } from 'src/game/types/game-data';
import { plainToClass } from '@nestjs/class-transformer';

@Injectable()
export class GamePlayService {
    private server: Server;
    private BOARD_ROWS = 10;
    private BOARD_COLS = 20;
    private rooms: {
        [index: string]: Room
    } = {};

    initGame(server: Server, room: Room) {
        this.server = server;
        this.rooms[room.id] = room;
        // 유저 수 만큼 테트리스 보드 배열 초기화
        Object.values(room.users).forEach(user => {
            const newgameData = new GameData();
            newgameData.board = Array.from(
                {length: this.BOARD_COLS}, () => Array.from(
                    {length: this.BOARD_ROWS}, () => 0
                )
            );
            room.users[user.username].gameData = newgameData;
        });

        setTimeout(() => {
            this.server.to(room.id).emit('game:info', {
                roomId: room.id,
                users: Object.keys(room.users).map(username => username)
            });
        }, 3000);
        setTimeout(() => {
            this.server.to(room.id).emit('game:start', 'start');
            room.interval = setInterval(() => this.play(room), 700);
        }, 5000);
    }

    play(room: Room) {
        Object.values(room.users).forEach(user => {
            const gameData: GameData = user.gameData;
            // 이미 생성된 조각이 있다면
            if (gameData.piece) {
                return;
            }
            // 새로운 조각 생성
            this.spawnPiece(gameData);
            
            this.server.to(room.id).emit('game:spawn', {
                username: user.username,
                pieceId: gameData.piece.id,
                x: gameData.piece.x,
                y: gameData.piece.y,
                tick: room.tick
            });
        });

        Object.values(room.users).forEach(user => {
            const gameData: GameData = user.gameData;
            const stat = this.naturalDrop(gameData);
            
            // 바닥에 닿이지 않으면
            if (stat) {
                this.server.to(room.id).emit('game:softdrop', {
                    username: user.username,
                    y: gameData.piece.y,
                    tick: room.tick
                });
            } else {
                this.server.to(room.id).emit('game:stack', {
                    username: user.username,
                    board: this.renderPiece(gameData),
                    tick: room.tick
                });
                delete gameData.piece;
                this.clearCheck(gameData, user);
            }
        });

        room.tick++;
    }

    gameControl(user: User, action: string, data: any) {
        const roomId = user.roomId;
        const room = this.rooms[user.roomId];
        const gameData = room.users[user.username].gameData;
        const { board, piece } = gameData;
        switch (action) {
            case 'harddrop': {
                // 생성된 조각이 없다면
                if (!piece) {
                    return;
                }
                // 블록이 바닥에 닿일 때 까지
                while (this.naturalDrop(gameData));

                this.server.to(roomId).emit('game:stack', {
                    username: user.username,
                    board: this.renderPiece(gameData),
                    tick: room.tick
                });
                delete gameData.piece;
                this.clearCheck(gameData, user);
                break;
            }
            case 'move': {
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
                if (!this.voidCheck(board, piece).flag) {
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
                this.server.to(roomId).emit('game:move', {
                    username: user.username,
                    x: gameData.piece.x,
                    y: gameData.piece.y
                });
                break;
            }
            case 'rotate': {
                // 생성된 조각이 없다면
                if (!piece) {
                    return;
                }
                // 유효한 명령어인지 확인
                if (!(['left', 'right']).includes(data)) {
                    return;
                }
                const pieceCheck = plainToClass(Piece, piece);
                pieceCheck.rotate(data);
                // 조각이 블록에 막혀있다면 캔슬
                if (!this.voidCheck(board, pieceCheck).flag) {
                    return;
                }
                piece.shape = pieceCheck.shape;
                this.server.to(roomId).emit('game:rotate', {
                    username: user.username,
                    direction: data
                });
                break;
            }
            case 'change': {
                // 생성된 조각이 없다면
                if (!piece) {
                    return;
                }
                // 이미 조각을 한 번 바꾸었다면
                if (gameData.pieceChange) {
                    return;
                }
                this.changePiece(gameData);
                gameData.piece.y++;
                this.server.to(roomId).emit('game:change', {
                    username: user.username,
                    holdPieceId: gameData.holdPiece.id,
                    pieceId: gameData.piece.id,
                    pieceX: gameData.piece.x,
                    pieceY: gameData.piece.y
                });
                break;
            }
            // 없는 명령어면 캔슬
            default: {
                return;
            }
        }
    }

    private spawnPiece(gameData: GameData): void {
        const piece = new Piece(gameData.pieceBag);
        gameData.piece = piece;
    }

    private changePiece(gameData: GameData): void {
        gameData.pieceChange = true;
        // 홀드한 조각이 없으면
        if (!gameData.holdPiece) {
            gameData.holdPiece = gameData.piece;
            gameData.holdPiece.init();
            this.spawnPiece(gameData);
            return;
        }
        // 있으면 서로 교체
        [gameData.holdPiece, gameData.piece] = [gameData.piece, gameData.holdPiece];
        gameData.holdPiece.init();
    }

    private naturalDrop(gameData: GameData): boolean {
        const { board, piece } = gameData;
        piece.y++;
        // 만약 블록이 땅이나 다른 블록까지 떨어진 상태라면
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
            gameData.pieceChange = false;
            return false;
        }
        return true;
    }

    private renderPiece(gameData: GameData): number[][] {
        const { piece } = gameData;
        const board = this.copyArray(gameData.board);
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
        return board;
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

    private clearCheck(gameData: GameData, user: User) {
        const { board } = gameData;
        board.forEach((rows: number[], y: number) => {
            // 줄이 블록으로 모두 채워졌다면
            if (rows.every(value => value > 0)) {
                // 해당 줄 삭제
                board.splice(y, 1);
                // 맨 윗줄에 새로운 줄 삽입
                board.unshift(Array.from({length: this.BOARD_ROWS}, () => 0));

                this.server.to(user.roomId).emit('game:clear', {
                    username: user.username,
                    y
                });
            }
        });
    }

    // 깊은 복사
    private copyArray(array: number[][]): number[][] {
        return array.map(rows => [...rows]);
    }
}