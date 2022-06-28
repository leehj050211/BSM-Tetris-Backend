import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { plainToClass } from '@nestjs/class-transformer';

import { RankingEntity } from './entities/ranking.entity';
import { User } from 'src/user/user';
import { ViewRankingType } from 'src/ranking/types/view-ranking';

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

    async viewRanking(): Promise<ViewRankingType[]> {
        const rankingInfo = await this.rankingRepository.createQueryBuilder('r')
            .select([
                'r.usercode usercode',
                'u.nickname nickname',
                'r.tick tick',
                'r.level level',
                'r.date date'
            ])
            .leftJoin('r.userFK', 'u')
            .orderBy('tick', 'DESC')
            .getRawMany();
        
        return rankingInfo.map(ranking => 
            plainToClass(
                ViewRankingType,
                ranking,
                {excludeExtraneousValues: true}
            )
        );
    }

    async viewMyRanking(user: User): Promise<ViewRankingType> {
        const rankingInfo = await this.rankingRepository.query(`
        SELECT 
            r.usercode usercode,
            u.nickname nickname,
            r.rank rank,
            r.tick tick,
            r.level level,
            r.date date
        FROM 
            user u,
            (SELECT 
                usercode usercode,
                tick tick,
                level level,
                date date,
                RANK() OVER (ORDER BY tick DESC) rank
            FROM ranking) r
        WHERE 
            r.usercode = ? AND
            r.usercode = u.usercode;
        `, [user.usercode]);
        
        return plainToClass(
            ViewRankingType,
            rankingInfo,
            {excludeExtraneousValues: true}
        );
    }
}
