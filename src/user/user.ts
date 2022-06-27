import { Expose } from "@nestjs/class-transformer";
import { IsNumber, IsString } from "class-validator"

export class User {
    @Expose()
    @IsNumber()
    usercode: number;

    @Expose()
    @IsString()
    nickname: string;
}