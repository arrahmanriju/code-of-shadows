# SHADOW AI debugging results

## Gemini connection

The terminal diagnostic initially found an API key in the inherited process environment but no `GEMINI_MODEL`. No `.env.local` existed. The SDK was already installed and correctly imported; the missing model caused the provider to throw before sending any API request. `.env.example` is a template, not a file Next.js loads automatically.

Created ignored `.env.local` containing only `GEMINI_MODEL=gemini-3.5-flash-lite`. The key was not printed, copied, or changed. A real Gemini request then returned exactly `GEMINI_CONNECTION_SUCCESS`. This verifies that the model was accessible with the existing key at test time; it does not guarantee future quota or availability.

Run the terminal-only development diagnostic again:

```sh
node scripts/check-gemini.mjs
```

There is no public diagnostic endpoint. The script refuses production execution and prints only key presence, model, connection status, a fixed success marker, and safe failure categories.

## Incorrect fallback root cause

Identity queries lost all terms because the tokenizer removed the name and introductory words as stop words. Retrieval then inserted `about` as its fallback query token, but `about` was also removed from document tokens. Nothing matched, so `/api/chat` returned local `NO_CONTEXT` without invoking Gemini. A separate missing-model configuration problem caused local fallback on otherwise relevant queries. The old generic catch did not distinguish these conditions.

## Targeted fixes

- Added bounded introduction intent patterns for Azizur Rahman, Azizur, Aziz, and Riju, including self-introduction and assistant identity questions in this portfolio context. Those queries retrieve existing biography, education, and ICPC records directly, up to three documents.
- Preserved lexical scoring and threshold for other questions. A mere name mention does not trigger biography context for unrelated questions. Normalization now removes English possessives and generic employment filler that caused false-positive overlap.
- Expanded the existing `about` record with the supplied education, status, programming experience, academic/personal projects, research, and achievements. Existing project records remain shared; no project copy or website rebuild was introduced.
- Clarified the prompt: natural concise introductions, third-person owner descriptions, no refusals when relevant facts exist, no unsupported degree-award claim, and factual grounding against untrusted history/source instructions. A limited user-history follow-up supplies context without becoming factual evidence.
- Added `source` (`gemini` / `local-fallback`), `documentIds`, and optional safe `errorCode`. Existing `mode`, `sources`, and `reason` remain compatible with the unchanged chat UI. Invalid input/origin/local rate limits retain appropriate HTTP error statuses.
- Classified missing key/model, authentication, unavailable model, provider quota, service errors, network failures, timeout, and invalid provider output. Relevant records still provide local answers during failures; local answers never claim to be Gemini.
- Added `CHAT_DEBUG=true` logging only under `NODE_ENV=development`. It records question length with text redacted, detected intent, retrieved IDs/scores, configured model, actual provider request, success/fallback, and safe error category. Raw questions, history, prompts, SDK errors, and keys are deliberately excluded because visitors can submit sensitive data. Production ignores this setting.

## Test evidence

Real HTTP requests to the existing development server returned `source: gemini` for all five introduction variants, education, AI/ML projects, technical skills, and ICPC. The France question returned `source: local-fallback`, `errorCode: NO_CONTEXT`, and no documents. Additional contact and follow-up behavior is covered by automated tests. Live API testing can be repeated with:

```sh
node scripts/smoke-chat.mjs
```

The local script sends nine relevant questions plus one unrelated question; it expects Gemini for relevant questions. Space runs at least one minute apart because public route protection allows 10 questions per minute. Provider success and unavailable behavior for every example category, 16 alias/intent combinations, invalid input, origin, rate limit, missing key, provider errors, timeout, and privacy-safe debugging are automated in `tests/chat.test.mjs`. Existing city regression tests also pass.

## Files

Created: `scripts/check-gemini.mjs`, `scripts/smoke-chat.mjs`, `lib/chat/errors.ts`, `lib/chat/debug.ts`, and this report. Modified: `lib/chat/retrieval.ts`, `service.ts`, `provider.ts`, `prompt.ts`, `fallback.ts`, `types.ts`, `app/api/chat/route.ts`, `data/knowledge.json`, `.env.example`, and `tests/chat.test.mjs`. Local configuration: ignored `.env.local` (model only). City, UI, camera, towers, music, and weather files were not changed by this debugging task.

## Configuration and limits

In any terminal/deployment without the inherited key, configure `GEMINI_API_KEY` in `.env.local` or server environment. Configure `GEMINI_MODEL` too, restart the server, and rerun the diagnostic. On Vercel add both variables to the desired environment and redeploy. Use Node.js 22+ for the installed Google SDK. Optional `CHAT_DEBUG=true` is development-only.

Model responses are grounded by prompt instructions, not guaranteed fact validation. Lexical retrieval can still miss novel paraphrases, and rate limits remain per-instance. The diagnostic and API tests verify actual connection/backend behavior; they do not constitute a new visual UI test.
