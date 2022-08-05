import { Controller, Get } from '@nestjs/common';
import { RoomDto } from 'src/game/dto/RoomDto';
import { GameRoomService } from 'src/game/game-room.service';

@Controller('game')
export class GameController {
    constructor(private gameRoomService: GameRoomService) {}

    @Get("room")
    roomList(): RoomDto[] {
        return this.gameRoomService.getRoomList();
    }
}
