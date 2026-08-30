<div align="center">

# My Raze ✨

**Self-hostable AI companion — she remembers you, sends you selfies, and your data never trains anyone's model.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![tRPC](https://img.shields.io/badge/tRPC-11-2596BE?logo=trpc&logoColor=white)](https://trpc.io/)
[![Drizzle](https://img.shields.io/badge/Drizzle_ORM-0.44-C5F74F?logo=drizzle&logoColor=black)](https://orm.drizzle.team/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

</div>

---

My Raze is a full-stack AI companion web app (PWA-installable). Create a
companion with her own personality, appearance, and interests; chat with
her over text or voice; ask her for scene-matched selfies generated from
her reference photo; and build the relationship through a 10-level
intimacy system.

**18+ only. Companions are AI-generated — not real people. Conversations
are never used to train models.** The safety protocol (AI disclosure,
age gate, self-harm crisis referrals) is published in
[`docs/SAFETY.md`](docs/SAFETY.md).

## Features

| | |
|---|---|
| **Chat** | Any OpenRouter model (default `gpt-4o-mini`), layered prompt system, 6 personality presets |
| **Selfies** | Scene-matched photos via fal.ai image editing, consistent with her reference photo; manual camera button with a visible daily quota |
| **Voice** | Browser TTS / ElevenLabs / Fish Audio playback; hold-to-talk input with Whisper transcription |
| **Relationship** | 10 intimacy levels with server-enforced anti-farming, dynamic mood, proactive in-app notifications |
| **Multi-companion** | Multiple companions, trash/restore, conversation search, PWA install |
| **Bring your own keys** | Users can store their own provider keys (encrypted at rest, AES-256-GCM); BYOK traffic bypasses the free-tier daily caps |

## Quick start (Docker)

```bash
git clone <this-repo> && cd my-raze
cp .env.example .env
# In .env, set at minimum:
#   JWT_SECRET             — openssl rand -hex 32
#   KEY_ENCRYPTION_KEY     — openssl rand -hex 32 (must differ from JWT_SECRET)
#   OPERATOR_OPENROUTER_KEY — an https://openrouter.ai key (chat)
#   OPERATOR_FAL_KEY        — an https://fal.ai key (selfies, optional)
#   RESEND_API_KEY + EMAIL_FROM — magic-link sign-in emails (production)

docker compose up --build
# → http://localhost:3000
```

Database migrations apply automatically on boot. Uploads land in a named
volume (`STORAGE_DRIVER=local`); switch to S3/R2/MinIO via the `S3_*`
variables in `.env.example`.

## Local development (no Docker)

Requirements: Node 22+, pnpm 10+, MySQL 8 (or MariaDB).

```bash
pnpm install
cp .env.example .env        # fill DATABASE_URL + the two secrets
pnpm db:push                # generate + apply migrations
pnpm dev                    # http://localhost:3000
```

Sign-in emails need no provider in dev: the magic link is printed to the
server terminal (Stdout driver). Click it and you're in.

```bash
pnpm test                   # vitest (DB-dependent cases need DATABASE_URL)
pnpm check                  # typecheck
pnpm build && pnpm start    # production bundle
```

## Configuration

Everything is documented inline in [`.env.example`](.env.example). The
short version:

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | yes | MySQL connection string |
| `JWT_SECRET`, `KEY_ENCRYPTION_KEY` | yes | session signing / BYOK key encryption (two distinct ≥32-char secrets) |
| `BETTER_AUTH_URL` | production | public URL of the deployment |
| `RESEND_API_KEY` or `SMTP_*` + `EMAIL_FROM` | production | magic-link email delivery |
| `STORAGE_DRIVER` | no | `local` (default) or `s3` |
| `OPERATOR_OPENROUTER_KEY` | for chat | serves users who don't bring their own key |
| `OPERATOR_FAL_KEY` / `OPERATOR_OPENAI_KEY` / `OPERATOR_ELEVENLABS_KEY` / `OPERATOR_FISH_AUDIO_KEY` | optional | selfies / Whisper / premium TTS |

**Free-tier caps** (per user, per UTC day, server-enforced): 30 chat
messages, 1 selfie. Users who add their own provider keys in Settings
bypass the caps. Numbers live in [`shared/quotas.ts`](shared/quotas.ts).

## Architecture

```
React 19 + Tailwind 4 + shadcn/ui + wouter  (client/)
        │  tRPC 11 (superjson) + CSRF double-submit
Express 4  (server/)
  ├── Better-Auth: email magic-link sessions   /api/auth/*
  ├── /files/*: local-disk stream or S3 presigned redirect
  ├── /healthz /readyz probes
  └── routers.ts: girlfriend / chat / selfie / voice / tts / apiConfig …
        │
  MySQL 8 (Drizzle ORM, migrations in drizzle/)
  OpenRouter · fal.ai · ElevenLabs · Fish Audio · OpenAI Whisper
```

Security posture: ownership-before-write on all conversation writes,
CSRF double-submit tokens, DOMPurify on model output, per-user
rate limits + daily meters, BYOK keys encrypted at rest, fail-fast env
validation, and no third-party fallback for chat — if no key is
configured the API says so instead of silently routing your messages
somewhere else.

## Project status

Production-capable and fully self-hostable. The app no longer depends on
any hosted platform — bring a MySQL database, an OpenRouter key, and
(optionally) a fal.ai key and you can run the whole thing with
`docker compose up`.

Delivered milestones:

- **M1 — Standalone MVP.** Email magic-link auth (Better-Auth), local/S3
  storage, OpenRouter-only AI path, server-side rate limits + daily
  quotas, Docker packaging with boot self-checks, and the compliance
  baseline (AI disclosure, 18+ age gate, self-harm crisis protocol).
- **M2 — Retention engine.** Long-term memory (extraction → relevance
  injection → a user-editable "what she remembers" page) and
  memory-aware proactive messages.
- **M3 — Subscriptions.** Lemon Squeezy billing with Free / Plus / Pro
  tiers and per-tier quotas; `BILLING_PROVIDER=none` unlocks everything
  for self-hosters.
- **M4 — Experience.** Intimacy-unlocked selfie poses, couple photos,
  a voice-in→voice-out loop, and Web Push for proactive messages.

287 automated tests; database migrations `0001`→`0018` apply cleanly
from an empty schema. See [`docs/REFACTORING.md`](docs/REFACTORING.md)
for the full history and the remaining hardening backlog (data-layer
foreign keys/indexes, CI, structured logging, full i18n).

## License

[MIT](LICENSE)
