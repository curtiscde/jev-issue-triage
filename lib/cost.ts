// What Jev costs: input tokens only, output is free (AI Gateway listing at time of writing).
// Kept apart from jev.ts so the browser page can use it without bundling the `ai` package.

export const PRICE_PER_MILLION_INPUT_TOKENS = 0.042; // USD

export const costOf = (inputTokens: number) => (inputTokens / 1e6) * PRICE_PER_MILLION_INPUT_TOKENS;
