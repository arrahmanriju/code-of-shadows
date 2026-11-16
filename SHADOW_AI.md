# SHADOW AI setup and implementation

## Local setup

Use Node.js 20.9+ (22 recommended). Run `npm install`, copy `.env.example` to `.env.local` (`Copy-Item .env.example .env.local` in PowerShell), then run `npm run dev`. Open http://localhost:3000 and select SHADOW AI in the bottom right. No API key is needed for local knowledge responses.

To enable Gemini, sign into [Google AI Studio](https://aistudio.google.com/apikey), create/select a project, and create an API key. Complete any project verification shown there. Set these server-side variables in `.env.local` and restart:

```dotenv
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-3.5-flash-lite
```

Never use `NEXT_PUBLIC_` for these variables or commit the key. The official [Google Gen AI SDK](https://googleapis.github.io/js-genai/release_docs/index.html) runs exclusively on the server. Google's [pricing page](https://ai.google.dev/gemini-api/docs/pricing#gemini-3.5-flash-lite), checked November 16, 2026, lists free input/output for this example model. Project eligibility, model availability, and quotas can change; verify in AI Studio. No paid database, separate server, or embeddings are required. Google may use free-tier requests to improve products; the UI reminds visitors to avoid personal information.

## Files

- `components/ShadowChat.tsx`, `components/ShadowChat.css`: floating terminal UI, responsive sizing, suggestions, loading/errors, clear/close, sources, Escape and focus cycling. Conversation stays in memory and is bounded. Chat hides during existing portfolio dialogs.
- `app/api/chat/route.ts`: server-side POST endpoint with same-origin checks, validation, limits, and structured JSON.
- `data/knowledge.json`: supplied professional profile, education, skills, ICPC, achievements, and research overview.
- `lib/chat/types.ts`, `knowledge.ts`, `retrieval.ts`, `prompt.ts`, `provider.ts`, `fallback.ts`, `validation.ts`, `rate-limit.ts`, `service.ts`: independent modules for the pipeline.
- `data/projects.ts`: reused by city and chat; adds supplied ride-pooling features, dataset categories, and reconciles Question Bank to the supplied Python/Streamlit/Supabase stack. Shared contact/social URLs come from `data/profile.ts`. The chatbot uses the supplied skills record rather than treating every older display tag as an additional verified skill.
- `components/Explorer.tsx`: replaces the disabled AI placeholder with SHADOW AI.
- `components/city-pan.ts`, `components/city-camera.ts`: explicit chat exclusions for capture-phase camera handlers.
- `tests/chat.test.mjs`: retrieval, grounding, errors, validation, timeout, origin, and rate-limit tests.
- `.env.example`, `.gitignore`, `package.json`, `package-lock.json`: configuration template and official SDK dependencies.

## Real AI and fallback behavior

The server normalizes text, scores lexical term overlap using inverse document frequency and title/keyword boosts, applies a relevance threshold, and selects up to three records. This is lexical RAG, not semantic/vector search. The Retriever interface can later be replaced with embeddings.

Gemini generates a concise answer from those records and at most six recent messages. System instructions require factual grounding, unknown-fact disclosure, and treating user/history/source instructions as untrusted data. Assistant history is never retrieved as evidence. Source links come from records; generated URLs are stripped. The UI renders text rather than HTML or model-generated Markdown.

No matches returns an explicit unknown answer without calling Gemini. Missing configuration, quota exhaustion, errors, empty answers, or timeouts return deterministic local extracts labeled **Local knowledge · AI unavailable**. These are not AI-generated answers. Basic Bangla retrieval is supported; fallback source extracts remain English. With a key, inspect `/api/chat` JSON for `mode: "gemini"` to verify live generation.

## API

POST JSON to `/api/chat`:

```json
{"question":"What is his education?","history":[{"role":"user","content":"Tell me about Azizur"}]}
```

Question: 1–600 characters. Optional history: at most six user/assistant messages, each 1–2000 characters. Body: at most 12 KB. Success returns `{answer, sources: [{id, title, url?}], mode: "gemini" | "local", reason?}`. Errors: 400 invalid input, 403 cross-origin browser request, 429 rate limit with `Retry-After`. Application code does not log prompts, keys, or conversation content.

The best-effort memory limiter allows 10 requests/client/minute and 60 total/instance/minute. On Vercel, the edge-forwarded IP is hashed in memory. Other environments share a local bucket. Counters reset at instance restart and are not shared across serverless instances. Add Vercel Firewall rules for stronger public protection. Origin checks do not authenticate non-browser clients. Gemini uses SDK timeout/cancellation plus an outer service deadline.

## Testing

```sh
node --test tests/*.test.mjs
npm run typecheck
npm run lint
npm run build
```

Tests cover education, AI/ML, skills, ICPC, contact, Bangla, unknown projects/metrics, irrelevant topics, missing key, simulated provider success/error/quota/timeout, invalid bodies/history, origins, and rate limits. Actual Gemini success requires your key and available quota.

Manual checks: try all five suggestions; Enter to submit; clear while loading; Escape to close and return focus; Tab/Shift+Tab through controls; scroll/drag chat without changing camera position. At 390px and 320px check panel boundaries, input, scrolling, and weather/music controls after closing chat. Check towers, 2D index, motion toggle, weather, music, Bat-Signal, projects, and résumé actions. Browser/mobile/keyboard interaction verification was blocked in this environment by a browser runtime sandbox startup error.

## Vercel deployment

Push the project to Git and import into Vercel with the Next.js preset and default build/output settings. Add `GEMINI_API_KEY` and `GEMINI_MODEL` under Project Settings → Environment Variables for Production/Preview as needed. Deploy or redeploy after setting them. Do not use static export because `/api/chat` needs server execution. Without variables the chatbot still works in local-knowledge mode. Verify the deployed API mode. This implementation does not publish or configure an external account.

## Limitations

Lexical matching can miss paraphrases and Bangla variations. Top-three retrieval and short history can omit relevant facts. Grounding instructions reduce hallucination but cannot guarantee the model never invents facts. Local extracts may provide related records instead of a precise answer. There is no shared limiter storage, authentication, durable history, streaming, vector search, automatic README fetching, or resume ingestion. Internship employer, dates, model scores, dataset size, and publications must remain unknown until supplied. Only professional public facts belong in the knowledge base.
