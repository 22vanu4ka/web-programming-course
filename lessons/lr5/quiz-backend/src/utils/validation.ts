import { z } from 'zod'

export const githubCallbackSchema = z.object({
  code: z.string().min(1, "Code is required")
})

export const SessionIdParamSchema = z.object({
  id: z.string().min(1),
});

export const AnswerSchema = z.object({  // для отправки ответа
  sessionId: z.string().optional(),
  questionId: z.string(),
  userAnswer: z.union([z.string(), z.array(z.string())]),
});

export const GradeSchema = z.object({  // для оценки эссе администратором
  answerId: z.string(),
  grades: z.array(z.number()).min(1, "At least one grade required"),
});

export const QuestionSchema = z.object({  // для создания/обновления вопроса
  text: z.string().min(1, "Question text is required"),
  type: z.enum(["single-select", "multiple-select", "essay"]),
  categoryId: z.string().min(1, "Category ID is required"),
  correctAnswer: z.union([z.string(), z.array(z.string())]).optional(),
  points: z.number().int().positive().default(1),
});

export type GithubCallbackInput = z.infer<typeof githubCallbackSchema>
export type AnswerInput = z.infer<typeof AnswerSchema>
export type GradeInput = z.infer<typeof GradeSchema>
export type QuestionInput = z.infer<typeof QuestionSchema>