import { z } from 'zod'

export const githubCallbackSchema = z.object({
  code: z.string().min(1, "Code is required")
})

export type GithubCallbackInput = z.infer<typeof githubCallbackSchema>