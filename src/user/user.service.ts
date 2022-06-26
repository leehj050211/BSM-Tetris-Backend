import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from './entities/user.entity';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { plainToClass } from '@nestjs/class-transformer';

import { CreateUserOAuthDTO } from 'src/user/dto/create-user-oauth.dto';
import { BSMOAuthCodeDTO } from 'src/user/dto/bsm-code-dto';
import { BSMOAuthResourceDTO } from 'src/user/dto/bsm-resource.dto';
import { User } from 'src/user/user';

const { CLIENT_ID, CLIENT_SECRET } = process.env;

@Injectable()
export class UserService {
  constructor(
    private httpService: HttpService,
    @InjectRepository(UserEntity) private userRepository: Repository<UserEntity>
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
  ) {}

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
}
