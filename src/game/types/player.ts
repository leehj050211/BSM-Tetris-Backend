import { Expose, Exclude } from '@nestjs/class-transformer'
import { GameData } from 'src/game/types/game-data';
import { User } from 'src/user/user';

export class Player {
    @Expose()
    clientId: string;
    
    @Expose()
    username: string;

    @Exclude()
    user: User | null = null;

    @Exclude()
    roomId: string | null = null;

    @Exclude()
    gameData: GameData | null = null;

    @Exclude()
    playing: boolean = false;
}