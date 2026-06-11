/* Request-body validation shared by the /api/author routes (POST create
   and PUT regenerate take the same payload). */

import { z } from "zod";

/* Vercel rejects bodies over ~4.5 MB; this guards the pipeline itself. */
export const MAX_TOTAL_MARKDOWN_CHARS = 1_500_000;

export const AuthorBodySchema = z.object({
  title: z.string().trim().min(1).max(300),
  summary: z.string().trim().min(1).max(2_000),
  eyebrow: z.string().trim().max(100).optional(),
  chapters: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(300),
        markdown: z.string().trim().min(1).max(200_000),
      })
    )
    .min(1)
    .max(40),
});

export type AuthorBody = z.infer<typeof AuthorBodySchema>;

export function totalMarkdownChars(body: AuthorBody): number {
  return body.chapters.reduce((sum, c) => sum + c.markdown.length, 0);
}

export function authoringFromBody(body: AuthorBody) {
  return {
    mode: "markdown" as const,
    chapters: body.chapters.map((c) => ({
      title: c.title.trim(),
      markdown: c.markdown,
    })),
    updatedAt: new Date().toISOString(),
  };
}
