import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from './entities/user.entity';
import { ClassTransformer } from '@nestjs/class-transformer';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity]),
    HttpModule,
    ClassTransformer
  ],
  controllers: [UserController],
  providers: [UserService]
})
export class UserModule {}
