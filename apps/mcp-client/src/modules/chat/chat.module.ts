import { Module } from '@nestjs/common';

import { ChatController } from '@/modules/chat/chat.controller';
import { ChatSessionService } from '@/modules/chat/chat-session.service';
import { ConnectionModule } from '@/modules/connection/connection.module';

@Module({
  imports: [ConnectionModule],
  controllers: [ChatController],
  providers: [ChatSessionService]
})
export class ChatModule {}
