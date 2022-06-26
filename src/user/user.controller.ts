import { Body, Controller, Get, Post, Res, UseGuards, Inject } from '@nestjs/common';
import { Response } from 'express';
import { CreateUserOAuthDTO } from 'src/user/dto/create-user-oauth.dto';
import { UserService } from './user.service';
import { LoggerService } from '@nestjs/common';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('oauth/bsm')
  BSMOAuth(
    @Res({passthrough: true}) res: Response,
    @Body() dto: CreateUserOAuthDTO
  ) {
    return this.userService.BSMOAuth(res, dto);
  }
}
