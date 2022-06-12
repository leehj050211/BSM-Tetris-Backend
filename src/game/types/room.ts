import { User } from "src/game/types/user";

export class Room {
    id: string;
    users: User[] = [];
}