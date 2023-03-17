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

    static create(userCode: number, nickname: string): UserEntity {
      const user = new UserEntity();
      user.userCode = userCode;
      user.nickname = nickname;
      return user;
    }

    update(nickname: string): void {
      this.nickname = nickname;
    }
}
