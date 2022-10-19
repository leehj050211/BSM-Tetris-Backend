import { Expose } from "@nestjs/class-transformer";
import { IsNumber, IsString } from "class-validator"

export class User {
    @Expose()
    @IsNumber()
    userCode: number;

    @Expose()
    @IsString()
    nickname: string;
}