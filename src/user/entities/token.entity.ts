import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn, RelationId } from 'typeorm';
import { UserEntity } from 'src/user/entities/user.entity';

@Entity('token')
export class TokenEntity {
    @PrimaryColumn({
        length: 128
    })
    token: string;

    @Column({
        default: true
    })
    valid: boolean;

    @ManyToOne(type => UserEntity)
    @JoinColumn({name: 'usercode'})
    userFK: UserEntity;

    @RelationId((token: TokenEntity) => token.userFK)
    usercode: number;

    @Column({nullable: false})
    created: Date;
}
