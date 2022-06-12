import { Piece } from "src/game/types/piece";

export class Game {
    roomId: string;
    board: {
        [index: string]: number[][]
    } = {};

    piece: {
        [index: string]: Piece
    } = {};
}