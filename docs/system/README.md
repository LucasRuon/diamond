---
date: 2026-05-09T23:17:26-03:00
researcher: Codex
git_commit: f040e1066ee18231c2bf20f4b0c78c5442423f8a
branch: diamond-expo
repository: Diamond-expo
topic: "Indice da documentacao tecnica do sistema Diamond X"
tags: [documentation, index, system]
status: complete
last_updated: 2026-05-09
last_updated_by: Codex
---

# Documentacao Tecnica - Diamond X

Esta pasta organiza a documentacao do sistema por area. A ideia e permitir que uma pessoa nova entenda o projeto lendo por camadas: estrutura, stack, frontend, backend, APIs, dados, fluxos e validacao.

## Arquivos

- [01-estrutura-do-projeto.md](./01-estrutura-do-projeto.md) - Organizacao de pastas, arquivos principais e convencoes.
- [02-stack-e-execucao.md](./02-stack-e-execucao.md) - Stack tecnica, dependencias, comandos e variaveis de ambiente.
- [03-frontend-app-nativo.md](./03-frontend-app-nativo.md) - Expo Router, telas, navegacao, componentes e design system.
- [04-backend-supabase.md](./04-backend-supabase.md) - Supabase, Auth, banco, RLS, migrations e Storage.
- [05-apis-e-integracoes.md](./05-apis-e-integracoes.md) - Edge Functions, Asaas, deep links e servicos internos.
- [06-fluxos-de-negocio.md](./06-fluxos-de-negocio.md) - Login, cadastro, reservas, check-in, planos, cobrancas e administracao.
- [07-dados-seguranca-e-permissoes.md](./07-dados-seguranca-e-permissoes.md) - Tabelas, roles, politicas, autorizacao e permissoes nativas.
- [08-testes-validacao-e-legado.md](./08-testes-validacao-e-legado.md) - TestSprite, validacao manual e arquivos PWA legados.

## Leitura Recomendada

Para onboarding tecnico, leia nesta ordem:

1. Estrutura do projeto.
2. Stack e execucao.
3. Frontend app nativo.
4. Backend Supabase.
5. APIs e integracoes.
6. Fluxos de negocio.
7. Dados, seguranca e permissoes.
8. Testes, validacao e legado.

## Estado Atual

O runtime principal documentado aqui e o app Expo/React Native em `app/` e `src/`. Os arquivos `index.html`, `css/`, `js/`, `manifest.json` e `service-worker.js` permanecem no repositorio como legado PWA, conforme explicado em [08-testes-validacao-e-legado.md](./08-testes-validacao-e-legado.md).

