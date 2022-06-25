import { Piece } from "src/game/types/piece";

export class GameData {
    board: number[][];
    piece: Piece;
    holdPieceId: number;
    pieceChange: boolean = false;
    pieceBag: number[] = [];
    ranking: number = 0;
}