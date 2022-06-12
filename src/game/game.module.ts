import { Module } from '@nestjs/common';
import { GameRoomService } from 'src/game/game-room.service';
import { GameGateway } from './game.gateway';

@Module({
    providers: [GameGateway, GameRoomService]
})

export class GameModule {}
