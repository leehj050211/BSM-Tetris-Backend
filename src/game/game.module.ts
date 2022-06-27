import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { WSAuthUtil } from 'src/auth/WS-auth.util';
import { GamePlayService } from 'src/game/game-play.service';
import { GameRoomService } from 'src/game/game-room.service';
import { RankingEntity } from 'src/ranking/entities/ranking.entity';
import { RankingModule } from 'src/ranking/ranking.module';
import { RankingService } from 'src/ranking/ranking.service';
import { TokenEntity } from 'src/user/entities/token.entity';
import { UserEntity } from 'src/user/entities/user.entity';
import { GameGateway } from './game.gateway';

@Module({
    imports: [
        TypeOrmModule.forFeature([UserEntity, TokenEntity, RankingEntity]),
        AuthModule,
        RankingModule
    ],
    providers: [
        GameGateway,
        GameRoomService,
        GamePlayService,
        WSAuthUtil,
        RankingService
    ]
})

export class GameModule {}
