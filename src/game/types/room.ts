import { User } from "src/game/types/user";

export class Room {
    id: string;
    playing: boolean = false;
    tick: number = 0;
    users: User[] = [];
}