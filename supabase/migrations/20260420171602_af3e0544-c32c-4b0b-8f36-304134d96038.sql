UPDATE public.messages
SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
  'transcription', jsonb_build_object(
    'text', content,
    'provider', 'gemini',
    'transcribed_at', to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  )
)
WHERE type = 'audio'
  AND content IS NOT NULL
  AND content <> ''
  AND content <> '[áudio - processando transcrição...]'
  AND (metadata->>'transcription') IS NULL;