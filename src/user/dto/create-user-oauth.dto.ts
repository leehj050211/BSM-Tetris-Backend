import { IsString } from "class-validator";

export class CreateUserOAuthDTO {
    @IsString()
    readonly authcode: string;
}