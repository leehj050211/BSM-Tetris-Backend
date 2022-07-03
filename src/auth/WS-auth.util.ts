import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { plainToClass } from '@nestjs/class-transformer';
import { Socket } from 'socket.io';
import { User } from 'src/user/user';
import { JwtService } from '@nestjs/jwt';
import { UserEntity } from 'src/user/entities/user.entity';
import { TokenEntity } from 'src/user/entities/token.entity';

@Injectable()
export class WSAuthUtil {
    constructor(
        private jwtService: JwtService,
        @InjectRepository(UserEntity) private userRepository: Repository<UserEntity>,
        @InjectRepository(TokenEntity) private tokenRepository: Repository<TokenEntity>
    ) {}

    private clients: {
        [index: string]: {
            socket: Socket,
            user: User
        }
    } = {};

    async authClient(client: Socket): Promise<User | null> {
        // 만약 클라이언트가 이미 인증되었다면
        if (this.clients[client.id]) {
            return this.clients[client.id].user;
        }
        const token = client.request.headers.cookie
            ?.split('; ')
            .find(cookie => cookie.startsWith('tetris_token='))
            ?.split('=')[1];
        
        try {
            const result = this.jwtService.verify(token);
            return plainToClass(User, result, {excludeExtraneousValues: true});
        } catch (error) {}

        // 인증에 실패했다면 리프레시 토큰이 사용 가능한지 확인
        let refreshToken = client.request.headers.cookie
            ?.split('; ')
            .find(cookie => cookie.startsWith('tetris_refreshToken='))
            ?.split('=')[1];
        if (!refreshToken) {
            return null;
        }

        try {
            refreshToken = this.jwtService.verify(refreshToken).refreshToken;
        } catch (error) {
            return null;
        }

        const tokenInfo = await this.tokenRepository.findOne({where: {token: refreshToken}});
        if (tokenInfo === null) return null;

        const userInfo = await this.userRepository.findOne({where: {usercode: tokenInfo.usercode}});
        if (userInfo === null) return null;

        // 인증이 성공되었으면
        return plainToClass(User, userInfo, {excludeExtraneousValues: true});
    }
}
