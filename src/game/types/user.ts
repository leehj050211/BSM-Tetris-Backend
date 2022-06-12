import { Expose, Exclude } from '@nestjs/class-transformer'

export class User {
    @Expose()
    clientId: string;
    
    @Expose()
    nickname: string;

    @Exclude()
    roomId: string | null = null;
}