---
date: 2026-05-09T23:17:26-03:00
researcher: Codex
git_commit: f040e1066ee18231c2bf20f4b0c78c5442423f8a
branch: diamond-expo
repository: Diamond-expo
topic: "Testes, validacao e legado do Diamond X"
tags: [documentation, tests, validation, legacy]
status: complete
last_updated: 2026-05-09
last_updated_by: Codex
---

# Testes, Validacao e Legado

## Testes Existentes

O projeto contem testes gerados em `testsprite_tests/`. Eles cobrem fluxos como:

- Cadastro.
- Login.
- Protecao de paginas autenticadas.
- Acesso a areas por papel.
- Dashboard de aluno.
- Reserva de treino.
- Cancelamento de reserva.
- Check-in por QR Code.
- Historico de presenca.
- Alunos vinculados ao responsavel.
- Atualizacao de perfil.
- Atualizacao de avatar.
- Compra de planos.
- Bloqueio de reserva proxima demais.

Arquivos relevantes:

- `testsprite_tests/testsprite_frontend_test_plan.json`.
- `testsprite_tests/testsprite-mcp-test-report.md`.
- `testsprite_tests/testsprite-mcp-test-report.html`.
- `testsprite_tests/standard_prd.json`.
- `testsprite_tests/TC001_*.py` ate `TC030_*.py`.

## Validacao Manual Expo Go

`docs/native-validation.md` contem checklist manual para validar a migracao nativa.

Areas cobertas:

- Autenticacao (`docs/native-validation.md:5`).
- Roteamento por perfil (`docs/native-validation.md:12`).
- Design system (`docs/native-validation.md:17`).
- Recursos nativos, como camera e QR (`docs/native-validation.md:23`).

Itens exemplos:

- Login com email e senha.
- Bloqueio com senha errada.
- Sessao persistente ao fechar e abrir Expo Go.
- Cadastro salvando nome, email, CPF e WhatsApp.
- Tabs corretas por role.
- Fonte Abnes nos headers.
- Toasts de sucesso/erro.
- Safe area sem sobreposicao.
- Camera abrindo para QR.

## Verificacoes Automatizadas Disponiveis

O projeto tem script de typecheck:

```bash
npm run typecheck
```

Ele executa `tsc --noEmit` (`package.json:10`).

## Documentos Historicos

Documentos importantes:

- `docs/research/2026-05-09-expo-go-native-migration.md`: pesquisa da migracao para Expo.
- `docs/specs/2026-05-09-expo-go-native-migration-spec.md`: spec da migracao.
- `docs/2026-05-09-project-inventory.md`: inventario antigo focado no PWA legado.
- `docs/research/` e `docs/specs/`: pesquisas e specs de alteracoes especificas.

## Legado PWA/Web

O repositorio ainda contem a versao web antiga:

- `index.html`.
- `manifest.json`.
- `service-worker.js`.
- `js/`.
- `css/`.

O README avisa que esses arquivos sao legado da antiga versao PWA/Web (`README.md:47`).

## Regra de Retirada do Legado

`docs/legacy-web-retirement.md` define que o legado so deve ser removido apos:

1. Aprovacao fisica no celular via Expo Go.
2. Publicacao inicial em TestFlight ou Google Play Internal Testing com EAS Build.
3. Confirmacao de rollback seguro por commit/snapshot.

Referencias: `docs/legacy-web-retirement.md:5`, `docs/legacy-web-retirement.md:8`, `docs/legacy-web-retirement.md:9`, `docs/legacy-web-retirement.md:10`.

Passos de limpeza listados no documento:

- Excluir `index.html`.
- Excluir `manifest.json`.
- Excluir `service-worker.js`.
- Excluir `css/` e `js/`.
- Ajustar scripts legados.
- Ajustar deep links Supabase para `diamondx://`.

Referencias: `docs/legacy-web-retirement.md:12`, `docs/legacy-web-retirement.md:13`, `docs/legacy-web-retirement.md:16`, `docs/legacy-web-retirement.md:18`.

## Estado Atual para QA

O app atual deve ser validado principalmente pelo fluxo Expo Go:

1. Configurar `.env.local`.
2. Rodar `npm install`.
3. Rodar `npm start`.
4. Abrir no Expo Go.
5. Validar checklist de `docs/native-validation.md`.
6. Rodar `npm run typecheck`.

## Observacoes

- Testes TestSprite existentes podem ter sido criados para fluxos anteriores e devem ser lidos junto do estado atual do app nativo.
- O inventario `docs/2026-05-09-project-inventory.md` documenta principalmente a versao PWA, entao deve ser tratado como historico.
- A documentacao tecnica atual do app nativo esta na pasta `docs/system/`.

