# Testes no React Native

Como migramos de um ambiente DOM (Web) para React Native, nossa estratégia de testes via **TestSprite** muda um pouco:

1. **Testes Unitários:** Para serviços e funções utilitárias (ex: validadores de CPF, calendário), usamos `jest` padrão. Não há dependência de DOM.
2. **Testes de UI/E2E:** Ferramentas baseadas em web (como Puppeteer) não rodam no Expo Native. Se o TestSprite for rodar testes funcionais, ele deve ser configurado com o **Appium** ou com o **Maestro** para interagir diretamente com o binário compilado `.apk` ou `.app` do Expo.

## O Que Testar?
1. **Regras de Negócio (`src/services`):** Validar se as chamadas para o Supabase retornam o que esperamos.
2. **Formatadores e Máscaras (`src/utils`):** O CPF está ganhando os pontos e traços corretos?
3. **Integração:** `AuthProvider` armazena a sessão corretamente no AsyncStorage após um `signIn` mockado?
