import { Player } from "src/game/types/player";

export class Room {
    id: string;
    init: boolean = false;
    playing: boolean = false;
    leftPlayers: number = 0;
    players: {
        [index: string]: Player
    } = {};
    level: number = 0;
    tick: number = 0;
    tickRate: number = 0;
    tickDelay: number = 700;
    interval: NodeJS.Timer;
}