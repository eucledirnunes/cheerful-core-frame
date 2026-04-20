-- Mark old audio messages without proper transcription as failed,
-- so the UI stops showing the infinite "Transcrevendo…" spinner.
UPDATE public.messages
SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
  'transcription', jsonb_build_object(
    'text', '',
    'provider', 'failed',
    'transcribed_at', to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'error', 'backfill_no_transcription'
  )
)
WHERE type = 'audio'
  AND created_at < now() - interval '2 minutes'
  AND (metadata->>'transcription') IS NULL
  AND (content IS NULL OR content = '' OR content = '[Áudio]' OR content = '[áudio - processando transcrição...]');