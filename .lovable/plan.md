

## Plano: Prefixar mensagens enviadas com o nome do operador logado

Toda mensagem enviada pelo operador no Chat ao Vivo será automaticamente prefixada com `*Nome:* ` (negrito do WhatsApp), sem que isso apareça no campo de digitação. O cliente recebe a mensagem identificando quem respondeu.

### Comportamento

- Operador digita: `Boa tarde! Segue o orçamento.`
- WhatsApp do cliente recebe: **Mauricio:** Boa tarde! Segue o orçamento.
- O campo de input continua mostrando só o que foi digitado — o prefixo é invisível para o operador.
- Na lista de mensagens enviadas (lado direito do chat), a mensagem aparece com o prefixo, igual o cliente vê — assim o time sabe quem mandou o quê no histórico.

### Como o nome é resolvido

Ordem de prioridade (primeira opção válida vence):
1. `profiles.full_name` do usuário logado (primeiro nome apenas — "Mauricio Silva" → "Mauricio")
2. `user.user_metadata.full_name` (fallback se profile ainda não foi carregado)
3. `user.email` antes do `@` (último recurso)

Se nenhum nome for resolvido, **a mensagem é enviada sem prefixo** (não bloqueia o envio).

### Mudanças técnicas

**1. Novo hook `src/hooks/useCurrentOperatorName.ts`**
- Lê `user` de `useAuth()`
- Busca `profiles.full_name` via `supabase.from('profiles').select('full_name').eq('user_id', user.id).maybeSingle()`
- Retorna `{ operatorName: string | null }` — apenas o primeiro nome, capitalizado
- Cacheia em memória para não consultar a cada envio

**2. `src/components/ChatInterface.tsx`**
- Importar `useCurrentOperatorName`
- Em `handleSendMessage`:
  ```ts
  const content = inputText.trim();
  setInputText('');
  const finalContent = operatorName 
    ? `*${operatorName}:* ${content}` 
    : content;
  await sendMessage(activeChat.id, finalContent);
  ```
- O `inputText` continua limpo (sem prefixo visível durante digitação).

### O que NÃO muda

- Mensagens da Nina (IA) — continuam sem prefixo.
- Mensagens recebidas do cliente — não tocadas.
- Edge function `send-evolution-message` — não muda; recebe o conteúdo já prefixado.
- Layout, cores, componentes visuais — intactos.
- Histórico antigo — não é reescrito (apenas mensagens novas levam o prefixo).

### Edge cases tratados

- **Operador sem nome no profile**: envia sem prefixo (não quebra fluxo).
- **Mensagem só com espaços**: já é bloqueada por `inputText.trim()`.
- **Áudio / anexos**: este plano cobre apenas texto. Áudios enviados pelo operador (se houver no futuro) não recebem prefixo nesta iteração.
- **Conversa em modo Nina (IA ativa)**: o prefixo só é aplicado quando o operador realmente envia algo manual — a IA continua respondendo sem prefixo.

