import { User } from "src/game/types/user";

export class Room {
    id: string;
    playing: boolean = false;
    leftPlayers: number = 0;
    users: {
        [index: string]: User
    } = {};
    level: number = 0;
    tick: number = 0;
    tickRate: number = 0;
    tickDelay: number = 800;
    interval: NodeJS.Timer;
}