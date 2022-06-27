import { Body, Controller, Get, Post, Res, UseGuards } from '@nestjs/common';
import { RankingService } from './ranking.service';
import JwtAuthGuard from 'src/auth/auth.guard';
import { User } from 'src/user/user';
import { GetUser } from 'src/auth/getUser.decorator';

@Controller('ranking')
export class RankingController {
    constructor(private rankingService: RankingService) {}
}
