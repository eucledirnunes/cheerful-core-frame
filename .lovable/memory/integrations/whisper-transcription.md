---
name: Whisper transcription
description: Audio message transcription using OpenAI Whisper with Gemini fallback in message-grouper
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
- `metadata.transcription = { text, provider: 'whisper' | 'gemini', transcribed_at }` — used by the chat UI to display the transcription block under the audio player.

## UI
`src/components/ChatInterface.tsx` renders the transcription block beneath the audio player using `renderTranscription(msg)`. Shows `Transcrevendo…` for audios under 60s old without transcription yet.

## Logs to grep when debugging
- `[whisper] success`
- `[whisper] failed, falling back to gemini`
- `[whisper] no OPENAI_API_KEY configured`
- `[gemini] success (fallback)`
