# SHADOW AI recruiter improvements

## Root causes
Career intent was buried in the broad about record, with no dedicated career category. Literal lexical overlap and a 28% query coverage cutoff rejected paraphrases with little vocabulary overlap. Portfolio classification and reference resolution missed conversational turns such as ?Why that field?? and ?Tell me about the first one.?

## Changes
- Added one structured career record with internship search, preferred AI/ML Engineer Intern role, other interests, objective, and explicit limits on salary, joining dates, full-time availability, and employment history. Existing education, biography, achievement, contact, and project records remain the factual sources; added RAG/LLM skills and the existing /resume page reference.
- Added recruiter intent routing, lexical synonym normalization, category-based selection, and named-project priority. Intent evidence bypasses lexical coverage; arbitrary unknown topics still need lexical evidence. Retrieval returns up to three records and preserves their verified source references. This is lightweight lexical retrieval, not semantic vector search.
- Added career/field/project follow-ups and ordinal project resolution from displayed project names. Assistant history selects references only; retrieved records supply facts. Existing six-message session history remains in memory in the client.
- Expanded the system instruction for recruiter evaluation, documented interests, balanced assessments, unknown facts, concise answers, and bullet lists. Untrusted history and knowledge cannot override grounding instructions. Verified links remain separate server-selected source actions.
- Kept the existing SDK, model configuration, server-only API key, error handling, timeouts, chat styling, and city features. Removed internal diagnostic fields from production chat responses; development diagnostics remain opt-in and redacted.

## Verification
- Automated suite: 140 passed, 0 failed, including 34 new recruiter/conversation regression cases. Recruiter cases exercise injected provider success and provider-error fallback paths; existing tests cover API validation, origin restrictions, rate limiting, timeout, missing credentials, and safe provider error categories.
- TypeScript: passed. ESLint: passed. Production build: passed.
- Live server-side diagnostic: gemini-3.5-flash-lite connected and returned the expected marker without logging the key.
- Live /api/chat: career goals, hiring strengths, and unknown salary questions each returned HTTP 200 with Gemini generation. Career retrieved the career record, hiring retrieved ML/software/ICPC evidence, and salary was acknowledged as unknown.

## Limits
Intent routing is rule-based and does not offer unrestricted semantic understanding. New unusual paraphrases may need vocabulary or routing updates. Generation remains probabilistic; mock-provider tests verify grounding inputs and orchestration rather than proving all future model output. The live provider can still occasionally introduce itself despite concise-answer instructions. Salary, joining dates, employment history, and full-time availability remain undocumented. Research records have limited implementation details and no verified performance metrics. The resume reference is the existing printable page, not a claim that a downloadable PDF exists.

## Files changed
- data/knowledge.json
- lib/chat/retrieval.ts
- lib/chat/conversation.ts
- lib/chat/prompt.ts
- lib/chat/fallback.ts
- app/api/chat/route.ts
- tests/chat.test.mjs
- SHADOW_AI_RECRUITER_REPORT.md


## Hiring suitability follow-up

Added an explicit HIRING_SUITABILITY conversation category and shared positive, critical, and development analysis in lib/chat/hiring.ts. Normalization handles grammar-independent recruitment terms, candidate value and comparison phrases, and bounded spelling corrections (including adjacent transpositions). Recent user context selects a relevant project or field for pronouns, while facts remain exclusively in knowledge records.

The prior evaluation bucket recognized the literal word hire, so a missing keyword alone does not explain the originally reported exact phrase. Its concrete gaps were missing recruit/value/comparison paraphrases and spelling tolerance, no dedicated category in orchestration, and a record-dump fallback without critical/development handling. Live verification also observed Gemini SERVICE_UNAVAILABLE for the exact question: that is a provider failure, not a retrieval failure, and now produces an appropriate evidence-based hiring fallback.

Hiring retrieval selects complementary profile, practical project, and ICPC records (at most three) using intent boosts independent of lexical coverage. Development questions instead select skills, career, and project evidence. The profile provides documented career interests and technical background; projects and ICPC provide practical and achievement evidence. Named project context and explicit software focus change project selection. Existing knowledge records are reused without new factual claims.

Gemini prompting and local fallback distinguish a positive assessment from critical and development questions. Unknown availability, skills, and employment details must not become invented deficiencies. Live checking exposed an unsupported inference about availability; the system instruction was tightened, and the repeated critical response correctly described documentation limits. Generated output remains probabilistic.

Verification: 174 automated tests passed, 0 failed (34 added in this follow-up), including requested variants, bounded typos, successful injected generation, unavailable-provider fallback, pronoun context, negative questions, development questions, and portfolio regressions. TypeScript, lint, and production build passed. The configured gemini-3.5-flash-lite connection diagnostic succeeded. Live critical and development queries returned Gemini answers; the exact positive question returned HTTP 200 with HIRING_SUITABILITY and a grounded local fallback on SERVICE_UNAVAILABLE.

Files changed in this follow-up: lib/chat/hiring.ts (new), lib/chat/conversation.ts, lib/chat/retrieval.ts, lib/chat/service.ts, lib/chat/fallback.ts, lib/chat/prompt.ts, tests/chat.test.mjs, and this report. The chatbot UI, city components, and provider implementation were not changed. A pre-existing/generated next-env.d.ts modification was left in place.
