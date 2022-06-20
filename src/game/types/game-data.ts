import { Piece } from "src/game/types/piece";

export class GameData {
    board: number[][];
    piece: Piece;
    holdPiece: Piece;
    pieceChange: boolean = false;
    pieceBag: number[] = [];
}