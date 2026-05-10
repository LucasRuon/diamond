---
date: 2026-05-09T23:17:26-03:00
researcher: Codex
git_commit: f040e1066ee18231c2bf20f4b0c78c5442423f8a
branch: diamond-expo
repository: Diamond-expo
topic: "Estrutura do projeto Diamond X"
tags: [documentation, structure]
status: complete
last_updated: 2026-05-09
last_updated_by: Codex
---

# Estrutura do Projeto

## Visao Geral

O Diamond X esta organizado como um aplicativo Expo/React Native com rotas em `app/`, codigo compartilhado em `src/`, backend Supabase em `migrations/` e `supabase/functions/`, documentacao em `docs/` e testes gerados em `testsprite_tests/`.

O README confirma que `app/` contem as telas roteadas pelo Expo Router e que `src/` concentra a logica principal do aplicativo (`README.md:37`, `README.md:39`, `README.md:40`).

## Mapa de Pastas

```text
app/                         Rotas Expo Router por grupo de usuario
src/components/              Design system e componentes reutilizaveis
src/features/                Telas e logicas por dominio
src/hooks/                   Hooks compartilhados
src/lib/                     Clientes externos
src/providers/               Providers globais
src/services/                Camada de acesso ao Supabase
src/theme/                   Tokens visuais, layout e tipografia
src/types/                   Tipos TypeScript do banco
src/utils/                   Formatadores, mascaras, validacoes e calendario
supabase/functions/          Edge Functions Deno
migrations/                  SQL de schema, RLS e triggers
docs/                        Documentacao, pesquisas e specs
testsprite_tests/            Testes e relatorios TestSprite
assets/                      Imagens, icones e fontes usadas pelo app
js/, css/, index.html        PWA legado mantido como referencia
```

## Arquivos de Entrada

- `package.json` define o nome `diamond-x`, a versao, a entrada `expo-router/entry`, scripts Expo e dependencias (`package.json:2`, `package.json:4`, `package.json:5`).
- `app.json` define nome do app, slug, scheme `diamondx`, orientacao, icones, splash e plugins Expo (`app.json:2`, `app.json:5`, `app.json:7`, `app.json:27`).
- `app/_layout.tsx` e o layout raiz do Expo Router. Ele carrega fontes, controla splash screen e instala os providers globais (`app/_layout.tsx:17`, `app/_layout.tsx:18`, `app/_layout.tsx:38`).
- `app/index.tsx` e a rota inicial que redireciona por sessao e role (`app/index.tsx:17`, `app/index.tsx:21`, `app/index.tsx:23`, `app/index.tsx:26`).

## Organizacao das Rotas

As rotas sao separadas por grupos:

- `app/(auth)/` - login, cadastro, recuperacao e atualizacao de senha.
- `app/(student)/` - area do aluno.
- `app/(responsible)/` - area do responsavel ou empresario.
- `app/(admin)/` - area administrativa.
- `app/profile.tsx` - rota compartilhada para perfil.

Cada grupo tem um `_layout.tsx` proprio para proteger sessao, renderizar o stack e mostrar as tabs correspondentes ao papel do usuario (`app/(student)/_layout.tsx:7`, `app/(responsible)/_layout.tsx:7`, `app/(admin)/_layout.tsx:7`).

## Organizacao do Codigo Fonte

- `src/features/auth/` contem servico de autenticacao e deep links.
- `src/features/student/` contem dashboards, treinos, planos e presenca do aluno.
- `src/features/responsible/` contem dashboards, alunos vinculados, treinos, planos e pagamentos do responsavel.
- `src/features/admin/` contem telas administrativas de usuarios, treinos, planos, cobrancas e relatorios.
- `src/features/profile/` contem a tela de perfil compartilhada.
- `src/components/ui/` contem componentes reutilizaveis do design system.
- `src/components/layout/` contem containers e navegacao inferior.
- `src/components/qr/` contem componentes de QR code e scanner.
- `src/services/` contem wrappers de consultas ao Supabase.

## Backend no Repositorio

- `migrations/` guarda SQL de alteracoes no banco, RLS e triggers.
- `supabase/functions/admin-update-user/index.ts` atualiza usuarios com permissao administrativa.
- `supabase/functions/asaas-checkout/index.ts` cria cobrancas no Asaas e registra compra em `student_plans`.

## Documentacao e Historico

- `docs/research/` guarda pesquisas tecnicas.
- `docs/specs/` guarda specs de implementacao.
- `docs/native-validation.md` guarda checklist manual para Expo Go.
- `docs/legacy-web-retirement.md` documenta quando remover o legado PWA.

## Legado Web/PWA

O repositorio ainda contem `index.html`, `manifest.json`, `service-worker.js`, `js/` e `css/`. O README descreve esses arquivos como legado da antiga versao PWA/Web (`README.md:47`). A regra de remocao esta em `docs/legacy-web-retirement.md` (`docs/legacy-web-retirement.md:1`, `docs/legacy-web-retirement.md:5`).

