# Memory: index.md
Updated: now

# Project Memory

## Core
CRM with AI agent Nina, integrated with WhatsApp via Evolution API.
No dedicated /admin route. Settings/registration toggle live on Team page.
Read `system_settings` with `.maybeSingle()` to prevent 406 errors on empty table.
Audio transcription: OpenAI Whisper primary, Gemini fallback. Stored in `messages.content` + `metadata.transcription`.

## Memories
- [Branding](mem://design/branding) — Rules for logos and visual branding assets
- [System Settings](mem://features/system-settings) — Global settings persistence and user registration control rules
- [User Management](mem://features/user-management) — Auto-assignment of roles, team members table, and onboarding
- [Evolution API](mem://integrations/evolution-api) — Phone number resolution and LID caching in Evolution API webhook
- [Whisper transcription](mem://integrations/whisper-transcription) — Audio transcription pipeline (OpenAI Whisper primary, Gemini fallback) with metadata format for chat UI
