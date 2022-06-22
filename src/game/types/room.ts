import { User } from "src/game/types/user";

export class Room {
    id: string;
    playing: boolean = false;
    leftPlayers: number = 0;
    tick: number = 0;
    users: {
        [index: string]: User
    } = {};
    interval: NodeJS.Timer;
}