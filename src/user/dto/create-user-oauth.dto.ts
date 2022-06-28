import { IsString } from "class-validator";

export class CreateUserOAuthDTO {
    @IsString()
    readonly code: string;
}