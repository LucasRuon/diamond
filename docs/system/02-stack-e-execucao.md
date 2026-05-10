---
date: 2026-05-09T23:17:26-03:00
researcher: Codex
git_commit: f040e1066ee18231c2bf20f4b0c78c5442423f8a
branch: diamond-expo
repository: Diamond-expo
topic: "Stack tecnica e execucao do Diamond X"
tags: [documentation, stack, setup]
status: complete
last_updated: 2026-05-09
last_updated_by: Codex
---

# Stack e Execucao

## Stack Principal

O Diamond X e um aplicativo nativo Expo/React Native.

- Expo `~54.0.33` (`package.json:15`).
- React Native `0.81.5` (`package.json:29`).
- React `19.1.0` (`package.json:28`).
- Expo Router `~6.0.23` (`package.json:23`).
- TypeScript `^5.9.3` (`package.json:39`).
- Supabase JS `^2.105.4` (`package.json:14`).

## Dependencias de UI e Recursos Nativos

- `lucide-react-native` para icones (`package.json:26`).
- `expo-font` para carregar fontes locais (`package.json:19`).
- `expo-splash-screen` para controlar a splash screen (`package.json:24`).
- `react-native-safe-area-context` para safe areas (`package.json:31`).
- `expo-camera` para QR scanner/check-in (`package.json:16`).
- `expo-image-picker` para avatar (`package.json:20`).
- `expo-linking` para deep links (`package.json:22`).
- `react-native-qrcode-svg` e `qrcode` para QR Code (`package.json:27`, `package.json:30`).

## Dependencias de Supabase no Native

O cliente Supabase usa:

- `@supabase/supabase-js` (`package.json:14`).
- `@react-native-async-storage/async-storage` para persistir sessao (`package.json:13`).
- `react-native-url-polyfill` para compatibilidade de URL APIs (`package.json:34`).

O client e criado em `src/lib/supabase.ts` com `AsyncStorage`, `autoRefreshToken`, `persistSession` e `detectSessionInUrl: false` (`src/lib/supabase.ts:1`, `src/lib/supabase.ts:7`, `src/lib/supabase.ts:11`).

## Scripts

Os scripts do projeto estao em `package.json`:

```bash
npm start
npm run android
npm run ios
npm run web
npm run typecheck
```

Mapeamento:

- `start`: `expo start`.
- `android`: `expo start --android`.
- `ios`: `expo start --ios`.
- `web`: `expo start --web`.
- `typecheck`: `tsc --noEmit`.

Referencia: `package.json:5`.

## Variaveis de Ambiente

O app espera:

```env
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Essas chaves aparecem em `.env.example` (`.env.example:1`). O modulo `src/config/env.ts` le as variaveis e avisa quando faltam (`src/config/env.ts:1`, `src/config/env.ts:6`).

## Configuracao Expo

`app.json` define:

- `name`: `Diamond X`.
- `slug`: `diamond-x`.
- `scheme`: `diamondx`.
- `orientation`: `portrait`.
- `userInterfaceStyle`: `dark`.
- Icone principal em `./assets/icons/icon-512.png`.
- Splash com `./base_icon_transparent_background.png`.
- Plugin `expo-router`.
- Plugins `expo-camera` e `expo-image-picker` com mensagens de permissao em portugues.

Referencias: `app.json:2`, `app.json:5`, `app.json:8`, `app.json:10`, `app.json:27`.

## Fontes e Assets

O layout raiz carrega:

- `Abnes`.
- `Montserrat-Regular`.
- `Montserrat-Medium`.
- `Montserrat-SemiBold`.
- `Montserrat-Bold`.
- `Montserrat-ExtraBold`.
- `Montserrat-Black`.

Referencia: `app/_layout.tsx:18`.

Assets principais:

- `base_icon_transparent_background.png`.
- `assets/icons/icon-512.png`.
- `assets/icons/icon-192.png`.
- `assets/bg-diamond.webp`.
- `assets/fonts/*`.

## Execucao Local

Fluxo recomendado:

1. Criar `.env.local` com as variaveis Supabase.
2. Rodar `npm install`.
3. Rodar `npm start`.
4. Abrir com Expo Go ou simulador.

O README descreve esse processo em "Como Executar" (`README.md:5`, `README.md:14`, `README.md:19`, `README.md:26`).

## Verificacao de Tipos

Use:

```bash
npm run typecheck
```

Esse comando roda `tsc --noEmit` (`package.json:10`).

