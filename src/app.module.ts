import { Module } from '@nestjs/common';
import { GameModule } from 'src/game/game.module';

@Module({
  imports: [GameModule]
})
export class AppModule {}
