import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { UserEntity } from 'src/user/entities/user.entity';

@Entity('token')
export class TokenEntity {
    @PrimaryColumn({
        length: 64
    })
    token: string;

    @Column({
        default: true
    })
    valid: boolean;

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
    createdAt: Date;
}
