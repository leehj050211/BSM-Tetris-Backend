import { Expose, Exclude } from '@nestjs/class-transformer'

export class User {
    @Expose()
    clientId: string;
    
    @Expose()
    username: string;

    @Exclude()
    roomId: string | null = null;
}