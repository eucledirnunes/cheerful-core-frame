---
name: Whisper transcription
description: Audio message transcription using OpenAI Whisper with Gemini fallback in message-grouper, plus Nina agent context delivery
type: integration
---

# Audio Transcription Pipeline

Audio messages from WhatsApp (via Evolution API or WhatsApp Official) are transcribed in `supabase/functions/message-grouper/index.ts`.

## Provider order
1. **Primary:** OpenAI Whisper (`whisper-1`, `language: pt`) via `https://api.openai.com/v1/audio/transcriptions` (multipart form-data, accepts `audio/ogg; codecs=opus` natively).
2. **Fallback:** Gemini 2.5 Flash via Lovable AI Gateway (input_audio with base64 ogg) — used only if Whisper fails or `OPENAI_API_KEY` is missing.

## Required secret
- `OPENAI_API_KEY` must be set. If absent, system silently uses Gemini only.

## Storage
Each transcribed audio writes to `messages`:
- `content` = transcription text (Nina reads from here — keep populated for backwards compatibility).
- `metadata.transcription = { text, provider: 'whisper' | 'gemini' | 'failed', transcribed_at }`.
- `provider: 'failed'` is used when Evolution download or both transcription providers fail; UI shows "Transcrição indisponível".

## Nina orchestrator integration (CRITICAL)
`supabase/functions/nina-orchestrator/index.ts` MUST give the agent full audio context:

1. `getMessageTextForAgent(message)` extracts `metadata.transcription.text` (falling back to `content`/`combined_content`).
2. History mapping prepends `[Mensagem enviada por áudio — transcrita]\n` to user messages where `type === 'audio'` and a transcription exists. This signals modality without hiding content.
3. The system prompt ALWAYS includes a `<audio_capabilities priority="critical-override">` block PREPENDED BEFORE the user-defined prompt AND a reminder appended AFTER. This is required because user-defined prompts (like default Nina) may declare the agent is "text-only", which the model would otherwise honor and refuse audio context. The override forbids phrases like "não consigo processar áudios", "comunicação é só por texto", etc.

## UI
`src/components/ChatInterface.tsx` renders the transcription block beneath the audio player using `renderTranscription(msg)`. Shows `Transcrevendo…` for audios under 30s old without transcription yet, and "Transcrição indisponível" for `provider: 'failed'`.

## Logs to grep when debugging
- `[whisper] success`
- `[whisper] failed, falling back to gemini`
- `[whisper] no OPENAI_API_KEY configured`
- `[gemini] success (fallback)`
- `[Nina] Effective incoming content:` — confirms transcription reached the agent prompt
