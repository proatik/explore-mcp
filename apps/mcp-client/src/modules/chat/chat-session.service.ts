import { randomUUID } from 'node:crypto';

import { Subject } from 'rxjs';
import {
  Inject,
  Injectable,
  ConflictException,
  NotFoundException,
  ServiceUnavailableException
} from '@nestjs/common';

import { createLogger } from '@woocommerce-mcp/shared';

import { Agent } from '@/modules/agent/agent';
import { EnvService } from '@/core/config/env.service';
import { LLM_PROVIDER } from '@/modules/llm/llm.constants';
import { describeError } from '@/core/error/classify-error';
import { WebApprover } from '@/modules/approval/web-approver';
import { Conversation } from '@/modules/conversation/conversation';
import { ApprovalPolicy } from '@/modules/approval/approval-policy';
import { RegistryService } from '@/modules/connection/registry.service';
import { DEFAULT_SYSTEM_PROMPT } from '@/modules/conversation/conversation.constants';
import {
  MAX_SESSIONS,
  NO_MODEL_MESSAGE,
  RUN_IN_PROGRESS_MESSAGE,
  SESSION_NOT_FOUND_MESSAGE,
  APPROVAL_NOT_FOUND_MESSAGE
} from '@/modules/chat/chat.constants';

import type { Observable } from 'rxjs';
import type { ChatEvent } from '@/modules/chat/chat.types';
import type { LlmProvider } from '@/modules/llm/llm.types';

interface ChatSession {
  id: string;
  events: Subject<ChatEvent>;
  approver: WebApprover;
  conversation: Conversation;
  isBusy: boolean;
}

// one conversation per browser tab; the agent runs here, never in the page.
@Injectable()
export class ChatSessionService {
  private readonly logger = createLogger('chat');
  private readonly sessions = new Map<string, ChatSession>();
  private readonly policy = new ApprovalPolicy();

  constructor(
    private readonly env: EnvService,
    private readonly registry: RegistryService,
    @Inject(LLM_PROVIDER) private readonly llm: LlmProvider | null
  ) {}

  create(): string {
    const id = randomUUID();
    const events = new Subject<ChatEvent>();
    const approver = new WebApprover((pending) => {
      events.next({ type: 'approval_required', ...pending });
    });

    this.sessions.set(id, {
      id,
      events,
      approver,
      conversation: new Conversation(DEFAULT_SYSTEM_PROMPT),
      isBusy: false
    });
    this.dropOldestSessions();

    return id;
  }

  events(sessionId: string): Observable<ChatEvent> {
    return this.session(sessionId).events.asObservable();
  }

  send(sessionId: string, text: string): void {
    const session = this.session(sessionId);

    if (!this.llm) throw new ServiceUnavailableException(NO_MODEL_MESSAGE);

    if (session.isBusy) throw new ConflictException(RUN_IN_PROGRESS_MESSAGE);

    session.isBusy = true;

    void this.run(session, this.llm, text);
  }

  answerApproval(
    sessionId: string,
    approvalId: string,
    isApproved: boolean
  ): void {
    const isAnswered = this.session(sessionId).approver.answer(
      approvalId,
      isApproved
    );

    if (!isAnswered) throw new NotFoundException(APPROVAL_NOT_FOUND_MESSAGE);
  }

  private async run(
    session: ChatSession,
    llm: LlmProvider,
    text: string
  ): Promise<void> {
    const agent = new Agent({
      llm,
      policy: this.policy,
      approver: session.approver,
      registry: this.registry.registry,
      maxSteps: this.env.maxSteps,
      onEvent: (event) => {
        session.events.next(event);
      }
    });

    session.events.next({ type: 'run_started' });

    try {
      await agent.run(session.conversation, text);
    } catch (error) {
      this.logger.error('agent run failed', error, { sessionId: session.id });

      session.events.next({ type: 'error', message: describeError(error) });
    } finally {
      session.isBusy = false;
      session.events.next({ type: 'run_finished' });
    }
  }

  private session(sessionId: string): ChatSession {
    const session = this.sessions.get(sessionId);

    if (!session) throw new NotFoundException(SESSION_NOT_FOUND_MESSAGE);

    return session;
  }

  private dropOldestSessions(): void {
    for (const [id, session] of this.sessions) {
      if (this.sessions.size <= MAX_SESSIONS) return;

      session.approver.declineAll();
      session.events.complete();
      this.sessions.delete(id);
    }
  }
}
