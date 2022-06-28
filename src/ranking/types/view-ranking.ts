import { Expose } from "@nestjs/class-transformer";
import { IsOptional } from "class-validator";

export class ViewRankingType {
    @Expose()
    usercode: number;

    @Expose()
    nickname: string;

    @Expose()
    tick: number;

    @Expose()
    level: number;

    @Expose()
    date: Date;

    @Expose()
    @IsOptional()
    rank?: number;
}