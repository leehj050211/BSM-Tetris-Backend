import { IsNumber, IsString } from "class-validator"

export class User {
    @IsNumber()
    usercode: number;

    @IsString()
    nickname: string;
}