import { Module } from '@nestjs/common';
import { RankingService } from './ranking.service';
import { RankingController } from './ranking.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RankingEntity } from './entities/ranking.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([RankingEntity])
    ],
    controllers: [RankingController],
    providers: [RankingService],
    exports: [RankingService]
})
export class RankingModule {}
