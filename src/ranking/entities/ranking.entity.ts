import { Entity, Column, PrimaryColumn, PrimaryGeneratedColumn, ManyToOne, JoinColumn, RelationId, Unique } from 'typeorm';
import { UserEntity } from 'src/user/entities/user.entity';

@Entity('ranking')
@Unique(['userCode'])
export class RankingEntity {
    @PrimaryGeneratedColumn('increment')
    @PrimaryColumn({unsigned: true})
    id: number;
    
    @ManyToOne(type => UserEntity, user => user.userCode)
    @JoinColumn({name: 'user_code'})
    user: UserEntity;

    @Column({
        nullable: false,
        unsigned: true,
        name: 'user_code'
    })
    userCode: number;
    
    @Column({nullable: false})
    tick: number;

    @Column({
        nullable: false,
        type: 'tinyint'
    })
    level: number;

    @Column({nullable: false})
    date: Date;
}
