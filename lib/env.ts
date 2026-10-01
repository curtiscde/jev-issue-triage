// Load .env and .env.local (Vercel OIDC token from `vercel env pull`).
import { existsSync } from 'node:fs';

for (const file of ['.env', '.env.local']) {
  if (existsSync(file)) process.loadEnvFile(file);
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}. See .env.example.`);
  return value;
}
