import { Entity, Column, PrimaryColumn, PrimaryGeneratedColumn, ManyToOne, JoinColumn, RelationId } from 'typeorm';
import { UserEntity } from 'src/user/entities/user.entity';

@Entity('ranking')
export class RankingEntity {
    @PrimaryGeneratedColumn('increment')
    @PrimaryColumn({unsigned: true})
    id: number;
    
    @ManyToOne(type => UserEntity, {nullable: false})
    @JoinColumn({name: 'usercode'})
    userFK: number;
    
    @RelationId((ranking: RankingEntity) => ranking.userFK)
    usercode: number;
    
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
