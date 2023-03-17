import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from './entities/user.entity';
import { ClassTransformer } from '@nestjs/class-transformer';
import { JwtModule } from '@nestjs/jwt';
import { TokenEntity } from 'src/user/entities/token.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
        UserEntity,
        TokenEntity
    ]),
    ClassTransformer,
    JwtModule
  ],
  controllers: [UserController],
  providers: [UserService]
})
export class UserModule {}
