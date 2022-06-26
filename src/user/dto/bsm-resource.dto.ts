import { IsNumber, IsString } from "class-validator";

export class BSMOAuthResourceDTO {
    @IsNumber()
    readonly code: number;

    @IsString()
    readonly nickname: string;
}