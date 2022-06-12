import { Module } from '@nestjs/common';
import { GamePlayService } from 'src/game/game-play.service';
import { GameRoomService } from 'src/game/game-room.service';
import { GameGateway } from './game.gateway';

@Module({
    providers: [GameGateway, GameRoomService, GamePlayService]
})

export class GameModule {}
