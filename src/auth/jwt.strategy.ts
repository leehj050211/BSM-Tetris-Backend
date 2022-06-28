import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { User } from '../user/user';
import { UserEntity } from 'src/user/entities/user.entity';
import { TokenEntity } from 'src/user/entities/token.entity';

const { SECRET_KEY } = process.env;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private jwtService: JwtService,
        @InjectRepository(UserEntity) private userRepository: Repository<UserEntity>,
        @InjectRepository(TokenEntity) private tokenRepository: Repository<TokenEntity>
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromExtractors([
                (req: Request) => {
                    return req?.cookies?.tetris_token || req?.cookies?.tetris_refreshToken;
                }
            ]),
            secretOrKey: process.env.SECRET_KEY,
            passReqToCallback: true
        })
    }

    async validate(req: Request, user: User): Promise<User> {
        if (user.usercode) {
            return user;
        }
        const { refreshToken } = this.jwtService.verify(req?.cookies?.tetris_refreshToken);
        if (refreshToken === undefined) {
            throw new UnauthorizedException();
        }
        const tokenInfo = await this.getToken(refreshToken);
        if (tokenInfo === null) {
            throw new UnauthorizedException();
        }
        const userInfo = await this.getUser(tokenInfo.usercode);
        if (userInfo === null) {
            throw new UnauthorizedException();
        }
        
        const token = this.jwtService.sign({...userInfo}, {
            secret: SECRET_KEY,
            algorithm: 'HS256',
            expiresIn: '1h'
        });
        req.res.cookie('token', token, {
            path: '/',
            httpOnly: true,
            maxAge: 1000*60*60
        });
        return userInfo;
    }

    private async getUser(usercode: number): Promise<UserEntity | null> {
        return this.userRepository.findOne({
          where: {
            usercode
          }
        })
      }

    private async getToken(token: string): Promise<TokenEntity | null> {
        return await this.tokenRepository.findOne({
            where: {
                token
            }
        })
    }
}