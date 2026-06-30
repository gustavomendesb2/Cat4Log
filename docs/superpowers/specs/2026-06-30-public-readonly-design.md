# Design: Catálogo público (somente leitura) + login do dono

**Data:** 2026-06-30

## Contexto

O cat4Log é um catálogo de cards de colecionáveis (Pokémon, DC, Naruto etc.) construído com React + Supabase. Atualmente qualquer acesso exige autenticação — sem sessão, o `Gate.tsx` renderiza a `LoginScreen` e bloqueia todo o app.

**Objetivo:** tornar o catálogo público (leitura sem login) mantendo edição exclusiva para o dono autenticado.

---

## Abordagem escolhida: `useAuth()` direto nos componentes

Componentes que contêm controles de edição consultam `useAuth().session` internamente. Se `session` é `null`, os controles de edição não renderizam. Sem prop drilling, sem novo contexto.

---

## Mudanças por arquivo

### 1. `src/Gate.tsx`

Remove o early-return que mostrava `<LoginScreen />` para visitantes não autenticados. Rotas são renderizadas para todos.

Antes:
```tsx
if (!session) return <LoginScreen />
```

Depois: esse bloco é removido. Visitante vê o catálogo normalmente.

### 2. `src/components/TopNavBar.tsx`

- Passa a consumir `useAuth()` internamente.
- Quando **sem sessão**: o botão `+` (add card) e o botão `+ coleção` não renderizam. No lugar aparece um botão "Entrar" discreto na direita da nav.
- Quando **com sessão**: botões de edição aparecem normalmente + um botão "Sair" no canto direito.
- Clicar em "Entrar" abre um modal de login (ver item 5).

### 3. `src/components/CardModal.tsx`

- Consome `useAuth()` internamente.
- O botão de engrenagem (⚙) que abre o painel de edição só renderiza quando `session` existe.
- **Auto-edit:** estado `editing` inicializa como `!card.imagePath` — card sem imagem já abre em modo upload.
- **Remove otimização:** remove estado `optimize` e o checkbox "Otimizar imagem antes de enviar". A chamada passa a ser `uploadCardImage(card, file, false)` — arquivo enviado sem processamento no browser.

### 4. `src/components/StyleTabs.tsx`

- Consome `useAuth()` internamente.
- Botões de criar estilo e renomear estilo só renderizam quando `session` existe.

### 5. Modal de Login embutido

`LoginScreen` é refatorado (ou um wrapper é criado) para funcionar como modal sobre o catálogo. O `Gate.tsx` não usa mais `LoginScreen` diretamente. A `TopNavBar` dispara a abertura do modal via estado local ou via contexto simples.

Implementação sugerida: estado `loginOpen` no `Gate.tsx` passado como prop para `TopNavBar`, e `{loginOpen && <LoginModal onClose={...} />}` no `Gate`.

### 6. Supabase RLS — leitura pública

As políticas de Row Level Security precisam permitir `SELECT` para o role `anon` nas tabelas usadas em leitura:

```sql
-- collections
create policy "public read collections"
  on collections for select using (true);

-- subcollections
create policy "public read subcollections"
  on subcollections for select using (true);

-- cards
create policy "public read cards"
  on cards for select using (true);
```

Storage bucket `card-images`: habilitar acesso público no dashboard do Supabase (Storage → bucket → Public).

Políticas de `INSERT`, `UPDATE`, `DELETE` permanecem exigindo autenticação (`auth.role() = 'authenticated'`).

---

## Mudanças fora do escopo

- `src/lib/catalog/image.ts` — sem alteração
- `src/lib/catalog/repository.ts` — sem alteração
- `src/auth/AuthProvider.tsx` — sem alteração
- `src/auth/authContext.ts` — sem alteração

---

## Critérios de sucesso

1. Visitante sem login acessa `/<slug>` e vê o catálogo completo.
2. Visitante não vê botão de adicionar card, nova coleção, engrenagem no modal, nem controles de estilo.
3. Clicar em card sem imagem já abre o painel de upload (somente para dono logado).
4. Dono clica "Entrar" na nav, faz login no modal, modal fecha, controles de edição aparecem.
5. Dono clica "Sair" e volta ao modo visualização.
6. Upload de imagem envia o arquivo sem otimização no browser.
