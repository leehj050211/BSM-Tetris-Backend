import { Injectable } from '@nestjs/common';
import { plainToClass } from '@nestjs/class-transformer';
import { Server, Socket } from 'socket.io';
import { Room } from 'src/game/types/room';
import { GameRoomService } from 'src/game/game-room.service';
import { Player } from 'src/game/types/player';
import { Piece } from 'src/game/types/piece';
import { GameData } from 'src/game/types/game-data';
import LEVEL from 'src/game/types/level';
import { RankingService } from 'src/ranking/ranking.service';
import { setTimeout } from 'timers/promises';

@Injectable()
export class GamePlayService {
    constructor(
        private rankingService: RankingService
    ) {}

    private server: Server;
    private BOARD_ROWS = 10;
    private BOARD_COLS = 20;
    private rooms: {
        [index: string]: Room
    } = {};

    init(rooms: {
        [index: string]: Room
    }) {
        this.rooms = rooms;
    }

    async initGame(server: Server, room: Room) {
        this.server = server;
        // 방 설정 초기화
        room.leftPlayers = Object.keys(room.players).length;
        room.tick = 0;
        room.tickDelay = LEVEL[room.tick].delay;
        room.tickRate = Math.floor((1000 / room.tickDelay) * 100) / 100;
        room.level = LEVEL[room.tick].level;

        await setTimeout(1000);
        this.server.to(room.id).emit('game:info', {
            roomId: room.id,
            players: Object.keys(room.players).map(username => username),
            level: room.level,
            tickRate: room.tickRate,
            tick: room.tick
        });

        await setTimeout(3000);
        room.playing = true;
        this.initPlayers(room, Object.values(room.players));
        clearInterval(room.interval);
        room.interval = setInterval(() => this.play(room), room.tickDelay);
        
        this.server.to(room.id).emit('game:start', 'start');
    }

    private initPlayers(room: Room, players: Player[]) {
        players.forEach(player => {
            // 테트리스 보드 배열 초기화
            const newgameData = new GameData();
            newgameData.board = Array.from(
                {length: this.BOARD_COLS}, () => Array.from(
                    {length: this.BOARD_ROWS}, () => 0
                )
            );
            player.playing = true;
            room.players[player.username].gameData = newgameData;
        });
    }

    private async play(room: Room) {
        if (!room.playing) return;
        // 모든 플레이어들이 게임 오버 되었다면
        if (room.leftPlayers <= 0) {
            room.playing = false;
            clearInterval(room.interval);
            // 방에 플레이어들이 있다면 게임 재시작
            if (Object.keys(room.players)) {
                this.server.to(room.id).emit('game:restart', {
                    time: 10
                });
                await setTimeout(6000);
                this.initGame(this.server, room);
            }
            return;
        }

        // 난이도 설정
        if (LEVEL[room.tick]) {
            room.tickDelay = LEVEL[room.tick].delay;
            room.tickRate = Math.floor((1000 / room.tickDelay) * 100) / 100;
            room.level = LEVEL[room.tick].level;
            clearInterval(room.interval);
            room.interval = setInterval(() => this.play(room), room.tickDelay);

            this.server.to(room.id).emit('game:level', {
                level: room.level,
                tickRate: room.tickRate,
                tick: room.tick
            });
        }

        Object.values(room.players)
            .filter(player => player.playing)
            .forEach(player => {
            const gameData: GameData = player.gameData;

            // 이미 생성된 조각이 없다면
            if (!gameData.piece) {
                // 새로운 조각 생성
                this.spawnPiece(gameData);
                
                this.server.to(room.id).emit('game:spawn', {
                    username: player.username,
                    pieceId: gameData.piece.id,
                    x: gameData.piece.x,
                    y: gameData.piece.y
                });
            }

            // 게임 진행
            const stat = this.naturalDrop(gameData);
            
            // 바닥에 닿이지 않으면
            if (stat) {
                this.server.to(room.id).emit('game:softdrop', {
                    username: player.username,
                    y: gameData.piece.y,
                    tick: room.tick
                });
            } else {
                // 만약 게임 오버되었다면
                if (gameData.piece.y < 0) {
                    player.playing = false;
                    gameData.ranking = room.leftPlayers--;
                    // 만약 로그인된 유저라면 랭킹 업데이트
                    if (player.user) {
                        this.rankingService.uploadData(player.user, room.tick, room.level);
                    }

                    return this.server.to(room.id).emit('game:gameover', {
                        username: player.username,
                        board: this.renderPiece(gameData),
                        ranking: gameData.ranking,
                        tick: room.tick
                    });
                }
                // 아니면
                this.server.to(room.id).emit('game:stack', {
                    username: player.username,
                    board: this.renderPiece(gameData),
                    tick: room.tick
                });
                delete gameData.piece;
                this.clearCheck(gameData, player);
            }
        });

        room.tick++;
    }

    gameControl(player: Player, action: string, data: any) {
        const roomId = player.roomId;
        const room = this.rooms[player.roomId];
        // 게임이 플레이 중인지 확인
        if (!room.playing || !player.playing) return;

        const gameData = room.players[player.username].gameData;
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
                    username: player.username,
                    board: this.renderPiece(gameData),
                    tick: room.tick
                });
                delete gameData.piece;
                this.clearCheck(gameData, player);
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
                    username: player.username,
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
                const pieceCheck = plainToClass(Piece, {
                    ...piece,
                    shape: this.copyArray(piece.shape)
                });
                pieceCheck.rotate(data);
                // 조각이 블록에 막혀있다면 캔슬
                if (!this.voidCheck(board, pieceCheck).flag) {
                    return;
                }
                piece.shape = pieceCheck.shape;
                this.server.to(roomId).emit('game:rotate', {
                    username: player.username,
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
                    username: player.username,
                    holdPieceId: gameData.holdPieceId,
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
        const piece = new Piece({
            pieceBag: gameData.pieceBag
        });
        gameData.piece = piece;
    }

    private changePiece(gameData: GameData): void {
        gameData.pieceChange = true;
        // 홀드한 조각이 없으면
        if (!gameData.holdPieceId) {
            gameData.holdPieceId = gameData.piece.id;
            this.spawnPiece(gameData);
            return;
        }
        // 있으면 서로 교체
        const holdPiece = new Piece({
            pieceId: gameData.holdPieceId
        });
        [gameData.holdPieceId, gameData.piece] = [gameData.piece.id, holdPiece];
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

    private clearCheck(gameData: GameData, player: Player) {
        const { board } = gameData;
        board.forEach((rows: number[], y: number) => {
            // 줄이 블록으로 모두 채워졌다면
            if (rows.every(value => value > 0)) {
                // 해당 줄 삭제
                board.splice(y, 1);
                // 맨 윗줄에 새로운 줄 삽입
                board.unshift(Array.from({length: this.BOARD_ROWS}, () => 0));

                this.server.to(player.roomId).emit('game:clear', {
                    username: player.username,
                    y
                });
            }
        });
    }

    async joinPlayer(room: Room, client: Socket) {
        await setTimeout(1000);
        client.emit('game:info', {
            roomId: room.id,
            players: Object.keys(room.players).map(username => username),
            level: room.level,
            tickRate: room.tickRate,
            tick: room.tick
        });
    }

    deletePlayer(room: Room, player: Player) {
        if (player.playing) {
            player.playing = false;
            --room.leftPlayers;
        }
        
        delete room.players[player.username];
        if (!Object.keys(room.players).length) {
            clearInterval(room.interval);
            delete this.rooms[room.id];
        }
    }

    // 깊은 복사
    private copyArray(array: number[][]): number[][] {
        return array.map(rows => [...rows]);
    }
}