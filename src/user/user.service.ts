import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { plainToClass } from '@nestjs/class-transformer';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'crypto';

import { UserEntity } from './entities/user.entity';
import { TokenEntity } from 'src/user/entities/token.entity';
import { User } from 'src/user/user';
import { CreateUserOAuthDTO } from 'src/user/dto/create-user-oauth.dto';
import { BSMOAuthCodeDTO } from 'src/user/dto/bsm-code-dto';
import { BSMOAuthResourceDTO } from 'src/user/dto/bsm-resource.dto';

const { CLIENT_ID, CLIENT_SECRET, SECRET_KEY } = process.env;

@Injectable()
export class UserService {
  constructor(
    private httpService: HttpService,
    private jwtService: JwtService,
    @InjectRepository(UserEntity) private userRepository: Repository<UserEntity>,
    @InjectRepository(TokenEntity) private tokenRepository: Repository<TokenEntity>
  ) {}
  
  private readonly getOAuthTokenURL = process.env.OAUTH_TOKEN_URL;
  private readonly getOAuthResourceURL = process.env.OAUTH_RESOURCE_URL;

    async BSMOAuth(
        res: Response,
        dto: CreateUserOAuthDTO
    ) {
        const { authcode } = dto;

        const getTokenPayload = {
            authcode,
            clientId: CLIENT_ID,
            clientSecret: CLIENT_SECRET
        };

        let tokenData: BSMOAuthCodeDTO;
        try {
            tokenData = plainToClass(BSMOAuthCodeDTO, (await lastValueFrom(this.httpService.post(this.getOAuthTokenURL, (getTokenPayload)))).data);
        } catch (err) {
            if (err.response.status == 404) {
                throw new NotFoundException('Authcode not found');
            }
            console.error(err);
            throw new InternalServerErrorException('OAuth Failed');
        }
        if (!tokenData.token) {
            throw new NotFoundException('Authcode not found');
        }
        
        const getResourcePayload = {
            token: tokenData.token,
            clientId: CLIENT_ID,
            clientSecret: CLIENT_SECRET
        };
        let resourceData: BSMOAuthResourceDTO;
        try {
            resourceData = plainToClass(BSMOAuthResourceDTO, (await lastValueFrom(this.httpService.post(this.getOAuthResourceURL, (getResourcePayload)))).data.user);
        } catch (err) {
            if (err.response.status == 404) {
                throw new NotFoundException('User not found');
            }
            console.error(err);
            throw new InternalServerErrorException('OAuth Failed');
        }
        if (!resourceData.code) {
            throw new NotFoundException('User not found');
        }
        
        let userInfo = await this.getByUsercode(resourceData.code);

        if (!userInfo) {
            await this.saveUser(resourceData);
            userInfo = await this.getByUsercode(resourceData.code);
            if (!userInfo) {
                throw new NotFoundException('User not Found');
            }
        }
        return this.login(res, userInfo);
    }

    private async login(
        res: Response,
        user: User
    ) {
        const token = this.jwtService.sign({...user}, {
            secret: SECRET_KEY,
            algorithm: 'HS256',
            expiresIn: '1h'
        });
        const refreshToken = this.jwtService.sign({
            refreshToken: (await this.createToken(user.usercode)).token
        }, {
            secret: SECRET_KEY,
            algorithm: 'HS256',
            expiresIn: '60d'
        });
        
        res.cookie('token', token, {
            path: '/',
            httpOnly: true,
            maxAge: 1000*60*60
        });
        res.cookie('refreshToken', refreshToken, {
            path: '/',
            httpOnly: true,
            maxAge: 24*60*1000*60*60
        });
        return {
            token,
            refreshToken: refreshToken
        }
    }

    private async saveUser(
        dto: BSMOAuthResourceDTO
    ) {
        const user = new UserEntity();
        user.usercode = dto.code;
        user.nickname = dto.nickname;
        await this.userRepository.save(user);
    }

    private async getByUsercode(usercode: number): Promise<UserEntity | undefined> {
        return this.userRepository.findOne({
            where: {
                usercode
            }
        })
    }

    private async createToken(usercode: number): Promise<TokenEntity> {
        const refreshToken = new TokenEntity();
        refreshToken.token = randomBytes(64).toString('hex');
        refreshToken.usercode = usercode;
        refreshToken.valid = true;
        refreshToken.created = new Date;
        await this.tokenRepository.save(refreshToken);
        return refreshToken;
    }
}
