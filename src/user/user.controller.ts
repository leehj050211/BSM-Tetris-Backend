import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { CreateUserOAuthDTO } from 'src/user/dto/create-user-oauth.dto';
import { UserService } from './user.service';
import JwtAuthGuard from 'src/auth/auth.guard';
import { User } from 'src/user/user';
import { GetUser } from 'src/auth/getUser.decorator';
import { plainToClass } from '@nestjs/class-transformer';

@Controller('user')
export class UserController {
    constructor(private readonly userService: UserService) {}

    @Get('oauth/bsm')
    oauth(
        @Res({passthrough: true}) res: Response,
        @Query('code') authCode: string
    ) {
        return this.userService.oauth(res, authCode);
    }

    @Get('/')
    @UseGuards(JwtAuthGuard)  
    getUserInfo(@GetUser() user: User) {
        return plainToClass(User, user, {excludeExtraneousValues: true});
    }
}
