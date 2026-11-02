import { map } from 'rxjs';
import {
  Sse,
  Body,
  Post,
  Param,
  HttpCode,
  HttpStatus,
  Controller
} from '@nestjs/common';

import { ZodBodyPipe } from '@/core/http/zod-body.pipe';
import { ChatSessionService } from '@/modules/chat/chat-session.service';
import {
  SendMessageSchema,
  AnswerApprovalSchema
} from '@/modules/chat/chat.schema';

import type { Observable } from 'rxjs';
import type { MessageEvent } from '@nestjs/common';
import type { SendMessage, AnswerApproval } from '@/modules/chat/chat.schema';

@Controller('api/sessions')
export class ChatController {
  constructor(private readonly chat: ChatSessionService) {}

  @Post()
  create(): { sessionId: string } {
    return { sessionId: this.chat.create() };
  }

  @Sse(':sessionId/events')
  events(@Param('sessionId') sessionId: string): Observable<MessageEvent> {
    return this.chat.events(sessionId).pipe(map((event) => ({ data: event })));
  }

  // the reply streams over the events endpoint, so this only accepts the message.
  @Post(':sessionId/messages')
  @HttpCode(HttpStatus.OK)
  send(
    @Param('sessionId') sessionId: string,
    @Body(new ZodBodyPipe(SendMessageSchema)) body: SendMessage
  ): { message: string } {
    this.chat.send(sessionId, body.text);

    return { message: 'Message accepted.' };
  }

  @Post(':sessionId/approvals/:approvalId')
  @HttpCode(HttpStatus.OK)
  answer(
    @Param('sessionId') sessionId: string,
    @Param('approvalId') approvalId: string,
    @Body(new ZodBodyPipe(AnswerApprovalSchema)) body: AnswerApproval
  ): { message: string } {
    this.chat.answerApproval(sessionId, approvalId, body.isApproved);

    return {
      message: body.isApproved ? 'Operation approved.' : 'Operation declined.'
    };
  }
}
