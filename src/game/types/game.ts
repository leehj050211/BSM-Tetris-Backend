import { UserGameData } from "src/game/types/user-game-data";

export class Game {
    roomId: string;
    user: {
        [index: string]: UserGameData;
    } = {};
}