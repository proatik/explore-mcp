import { z } from 'zod';

export const SendMessageSchema = z.object({
  text: z.string().trim().min(1).max(4000)
});

export const AnswerApprovalSchema = z.object({
  isApproved: z.boolean()
});

export type SendMessage = z.infer<typeof SendMessageSchema>;

export type AnswerApproval = z.infer<typeof AnswerApprovalSchema>;
