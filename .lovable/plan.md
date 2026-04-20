

## Plano: Whisper para transcrição de áudios no chat

Você confirmou que já tem uma chave da OpenAI configurada. Vou usá-la (`OPENAI_API_KEY`) — sem precisar de nova secret.

### Mudanças

**1. `supabase/functions/message-grouper/index.ts`**
- Reescrever `transcribeAudio()` para chamar `https://api.openai.com/v1/audio/transcriptions`:
  - `model: whisper-1`, `language: pt`, `response_format: json`
  - Envia o áudio como `multipart/form-data` (Whisper aceita ogg/opus do WhatsApp nativo)
- Manter **Gemini 2.5 Flash como fallback** se Whisper falhar (rate limit, sem créditos, etc.) — não perde transcrição.
- Salvar resultado em **dois lugares**:
  - `messages.content` → continua com a transcrição (Nina lê daqui — compatibilidade total)
  - `messages.metadata.transcription` → novo bloco `{ text, provider: 'whisper' | 'gemini', transcribed_at }`
- Logs claros: `[whisper] success`, `[whisper] fallback to gemini`, etc.

**2. `src/types.ts`**
- Adicionar campo opcional em `UIMessage`: `transcription?: { text: string; provider: string; transcribed_at: string }`
- Atualizar `transformDBToUIMessage` para extrair `metadata.transcription` quando existir.

**3. `src/components/ChatInterface.tsx`**
- Abaixo do player de áudio, novo bloco de transcrição:
  - Ícone `FileText` + label "Transcrição"
  - Texto em itálico, cor secundária
  - Badge pequeno indicando provedor (`whisper` / `gemini`) — útil para debug
  - Estado "Transcrevendo…" se a mensagem é áudio recente (<60s) e ainda não tem transcrição

**4. Áudios antigos (já transcritos por Gemini)**
- Migration leve: para mensagens `type='audio'` que têm `content` não-vazio mas **não** têm `metadata.transcription`, preencher `metadata.transcription = { text: content, provider: 'gemini', transcribed_at: created_at }`. Assim o histórico já mostra a transcrição no chat sem re-processar nada.

**5. Memória**
- Criar `mem://integrations/whisper-transcription`: provider primário Whisper (OpenAI), fallback Gemini, formato do `metadata.transcription`, exigência da `OPENAI_API_KEY`.

### Fluxo final

```text
Áudio chega no webhook
        |
        v
message-grouper baixa o base64 (Evolution getBase64)
        |
        v
Tenta Whisper (OpenAI) ──► sucesso ► salva content + metadata.transcription{whisper}
        │
        falha
        ▼
Fallback Gemini       ──► salva content + metadata.transcription{gemini}
        |
        v
Nina lê content (igual hoje)
ChatInterface mostra player + bloco "Transcrição: ..."
```

### Detalhes técnicos
- **Custo**: Whisper ≈ $0.006/min. Mensagens curtas de WhatsApp ficam em frações de centavo.
- **Formato**: Whisper aceita `audio/ogg; codecs=opus` direto — sem conversão.
- **Limite**: 25MB por arquivo (≈ 25min) — muito além do uso normal de WhatsApp.
- **Idioma fixo `pt`** para melhorar precisão e velocidade.
- Não toco no fluxo de **resposta em áudio** (ElevenLabs) — independente.

