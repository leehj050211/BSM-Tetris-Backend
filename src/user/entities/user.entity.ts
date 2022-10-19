import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('user')
export class UserEntity {
    @PrimaryColumn({
        unsigned: true,
        name: 'user_code'
    })
    userCode: number;

    @Column({
        nullable: false,
        length: 20
    })
    nickname: string;
}
