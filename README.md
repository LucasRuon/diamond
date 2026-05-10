# Diamond X - Performance & Training Center

Aplicativo Nativo desenvolvido com **React Native** e **Expo Router** para alunos, responsáveis e administradores.

## Como Executar (Ambiente de Desenvolvimento)

### Pré-requisitos
- Node.js
- Aplicativo "Expo Go" instalado no seu celular (iOS ou Android).
- Projeto Supabase configurado (Backend).

### Passo a Passo

1. **Instale as dependências:**
   ```bash
   npm install
   ```

2. **Configure o Ambiente:**
   Crie um arquivo `.env.local` na raiz do projeto com as chaves do seu Supabase:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=sua_url_aqui
   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sua_chave_anon_aqui
   ```

3. **Inicie o Servidor:**
   ```bash
   npm start
   # ou
   npm start -- -c # para limpar o cache do Metro Bundler
   ```

4. **Abra no Celular:**
   - **iOS:** Abra a Câmera do iPhone e aponte para o QR Code que aparecerá no terminal. Clique no link do Expo Go.
   - **Android:** Abra o app Expo Go e escaneie o QR Code diretamente por lá.

## Estrutura de Pastas

- `app/`: Contém todas as telas do aplicativo, roteadas magicamente pelo Expo Router. É dividida por papéis `(auth)`, `(student)`, `(admin)`, `(responsible)`.
- `src/`: Lógica principal do app.
  - `components/`: Componentes visuais do Design System (Cards, Botões, Tipografia, etc.).
  - `services/`: Camada de chamadas para o Supabase.
  - `theme/`: Cores, fontes e tokens originais do app.
  - `utils/`: Funções utilitárias (formatação, validação de CPF, etc.).
- `assets/`: Imagens e Fontes customizadas (Abnes e Montserrat).

## Aviso de Legacy
Os arquivos `.html`, `css/` e `js/` são legados da antiga versão PWA/Web e serão removidos do repositório em breve após a validação nativa total.
