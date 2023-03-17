import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { plainToClass } from '@nestjs/class-transformer';

import { RankingEntity } from './entities/ranking.entity';
import { User } from 'src/user/user';
import { ViewRankingType } from 'src/ranking/types/view-ranking';

@Injectable()
export class RankingService {
    constructor(@InjectRepository(RankingEntity) private rankingRepository: Repository<RankingEntity>) {}

    async uploadData(user: User, tick: number, level: number) {
        await this.rankingRepository.query(`
        INSERT INTO ranking (
            tick,
            level,
            date,
            user_code
        ) values (
            ?,
            ?,
            ?,
            ?
        ) ON DUPLICATE KEY UPDATE 
            level = IF((tick < ?), ?, level),
            date = IF((tick < ?), ?, date),
            tick = IF((tick < ?), ?, tick)
        `, [
            tick,
            level,
            new Date,
            user.userCode,
            tick, level,
            tick, new Date,
            tick, tick
        ]);
    }

    async viewRanking(): Promise<ViewRankingType[]> {
        const rankingInfo = await this.rankingRepository.createQueryBuilder('r')
            .select([
                'r.user_code usercode',
                'u.nickname nickname',
                'r.tick tick',
                'r.level level',
                'r.date date'
            ])
            .leftJoin('r.user', 'u')
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
            r.user_code usercode,
            u.nickname nickname,
            r.rank rank,
            r.tick tick,
            r.level level,
            r.date date
        FROM 
            user u,
            (SELECT 
                user_code,
                tick,
                level,
                date,
                RANK() OVER (ORDER BY tick DESC) rank
            FROM ranking) r
        WHERE 
            r.user_code = ? AND
            r.user_code = u.user_code;
        `, [user.userCode]);
        
        return plainToClass(
            ViewRankingType,
            rankingInfo[0],
            {excludeExtraneousValues: true}
        );
    }
}
