import { Body, Controller, Get, Post, Res, UseGuards } from '@nestjs/common';
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

    @Post('oauth/bsm')
    BSMOAuth(
        @Res({passthrough: true}) res: Response,
        @Body() dto: CreateUserOAuthDTO
    ) {
        return this.userService.BSMOAuth(res, dto);
    }

    @Get('/')
    @UseGuards(JwtAuthGuard)  
    getUserInfo(@GetUser() user: User) {
        return plainToClass(User, user, {excludeExtraneousValues: true});
    }
}
