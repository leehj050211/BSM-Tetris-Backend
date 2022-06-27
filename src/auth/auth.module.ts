import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TokenEntity } from 'src/user/entities/token.entity';
import { UserEntity } from 'src/user/entities/user.entity';
import { JwtStrategy } from './jwt.strategy';

@Module({
    imports: [
        TypeOrmModule.forFeature([UserEntity, TokenEntity]),
        PassportModule.register({ defaultStrategy: 'jwt'}),
        JwtModule.register({
            secret: process.env.SECRET_KEY
        })
    ],
    providers: [JwtStrategy]
})
export class AuthModule {}
