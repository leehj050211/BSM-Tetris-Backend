import { Piece } from "src/game/types/piece";

export class UserGameData {
    board: number[][];
    piece: Piece;
    holdPiece: Piece;
    pieceChange: boolean = false;
}