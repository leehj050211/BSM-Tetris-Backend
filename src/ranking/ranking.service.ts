import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { plainToClass } from '@nestjs/class-transformer';

import { RankingEntity } from './entities/ranking.entity';
import { User } from 'src/user/user';

@Injectable()
export class RankingService {
    constructor(@InjectRepository(RankingEntity) private rankingRepository: Repository<RankingEntity>) {}

    async uploadData(user: User, tick: number, level: number) {
        if (!await this.rankingRepository.findOne({where:{userFK: user.usercode}})) {
            const newRanking: RankingEntity = plainToClass(RankingEntity, {
                userFK: user.usercode,
                tick,
                level,
                date: new Date
            });
    
            await this.rankingRepository.save(newRanking);
            return;
        }

        await this.rankingRepository.update({
            userFK: user.usercode,
            tick: LessThan(tick)
        }, {
            tick,
            level,
            date: new Date
        });
    }
}
