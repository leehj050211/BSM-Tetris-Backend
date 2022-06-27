import { Expose, Exclude } from '@nestjs/class-transformer'
import { GameData } from 'src/game/types/game-data';

export class Player {
    @Expose()
    clientId: string;
    
    @Expose()
    username: string;

    @Exclude()
    roomId: string | null = null;

    @Exclude()
    gameData: GameData | null = null;
}