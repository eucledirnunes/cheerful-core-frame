

## Diagnóstico

**Problema confirmado:** Você mandou mensagem do número `5548996911268` (final 1268), mas o sistema gravou o contato como `16089199161420` (final 1420). O número 1420 é um **LID** (Linked-device ID) — um identificador interno do WhatsApp, **não um número de telefone real**.

**Por quê?** A versão da Evolution API que está rodando agora (`bia`, self-hosted) envia o payload assim:

```json
"key": {
  "id": "3EB07DDDE831E19C2B4091",
  "fromMe": false,
  "remoteJid": "16089199161420@lid"
}
```

Sem os campos `remoteJidAlt` nem `senderPn`. O webhook tem fallback para esses dois (que existiam em versões anteriores), mas como nenhum vem no payload, ele cai no último fallback (`whatsappId = remoteJid`) e salva o LID como se fosse telefone.

## Solução: Fallback resolvendo LID via Evolution API

Manter toda a lógica atual intacta (prioridade `remoteJidAlt` → `senderPn`) e adicionar **um terceiro fallback** quando ambos estiverem ausentes mas o `remoteJid` for `@lid`: chamar a Evolution API para resolver o número real.

### Endpoints da Evolution para resolver LID → número real

A Evolution v2 expõe alguns endpoints úteis. Vou tentar nesta ordem (parando no primeiro que funcionar):

1. **`POST /chat/findContacts/{instance}`** com `{ where: { id: "16089199161420@lid" } }` — retorna o contato com `id` = JID real (`5548996911268@s.whatsapp.net`)
2. **`POST /chat/whatsappNumbers/{instance}`** com `{ numbers: ["16089199161420"] }` — útil para validar
3. **`GET /chat/findChats/{instance}`** + filtro local — fallback amplo

Se nenhum funcionar, mantemos o comportamento atual (salva o LID) para não quebrar nada.

### Cache para evitar chamadas repetidas

Cada LID resolvido será cacheado na coluna `metadata` do contato existente quando encontrarmos o match (`{ lid_aliases: ["16089199161420@lid"] }`), e nas próximas mensagens olhamos primeiro o cache antes de chamar a API.

## Mudanças

### 1. `supabase/functions/evolution-webhook/index.ts`
- Nova função `resolveLidToRealNumber(lid, instance, secrets)` que:
  - Tenta `chat/findContacts` primeiro
  - Tenta `chat/findChats` como segundo recurso
  - Retorna `{ phoneNumber, whatsappId }` ou `null`
- Refatorar o trecho de resolução (linhas ~157-176 em `processMessageUpsert` e ~380-387 em `saveOutgoingMessage`) para chamar esse fallback quando `isLid && !remoteJidAlt && !senderPn`
- Logar claramente qual estratégia resolveu (`remoteJidAlt` / `senderPn` / `lid-api-resolve` / `lid-fallback`)

### 2. Migration de limpeza (opcional, com confirmação)
- Tabela `contacts` tem 1 contato com phone_number = LID (`16089199161420`). Posso:
  - **(a)** Deixar como está e o fallback novo cria o contato correto na próxima mensagem (vão coexistir)
  - **(b)** Atualizar esse contato uma vez resolvido o número via API
  
  Vou pedir confirmação antes de mexer no contato existente.

### 3. Memória atualizada
Atualizar `mem://integrations/whatsapp-phone-resolution` documentando a nova ordem: `remoteJidAlt → senderPn → API lookup → remoteJid (último recurso)`.

## Fluxo final

```text
Webhook recebe mensagem
        |
        v
remoteJid contém @lid?
   |              |
   não            sim
   |              |
   v              v
usa remoteJid   tem remoteJidAlt? -> usa
                tem senderPn?     -> usa
                cache no contato? -> usa
                                   |
                                   v
                          Chama Evolution API
                          (findContacts/findChats)
                                   |
                                   v
                          Achou número real?
                          sim -> usa + cacheia
                          não -> usa LID (fallback)
```

## Pergunta antes de implementar

Sobre o contato já criado errado (`adf94abc... → 16089199161420`):

