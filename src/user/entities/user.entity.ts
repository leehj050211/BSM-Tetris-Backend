import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('user')
export class UserEntity {
    @PrimaryColumn({unsigned: true})
    usercode: number;

    @Column({
        nullable: false,
        length: 20
    })
    nickname: string;
}
