# Desativação do PWA Legado

A estrutura atual conta com duas "almas": os arquivos modernos do Expo (`app/`, `src/`) e os antigos do Web/PWA (`css/`, `js/`, `index.html`, `service-worker.js`).

## Condições para Exclusão (Retirement)
Apenas remova a pasta `css/`, `js/` e os arquivos `.html` após:

1. **Aprovação Física:** O cliente/dono testou o app no próprio celular através do Expo Go e validou que o fluxo principal está ocorrendo normalmente.
2. **Publicação Inicial:** A versão `1.0.0` for submetida (mesmo que em TestFlight ou Google Play Internal Testing) e compilada com sucesso usando o EAS Build.
3. **Rollback Seguro:** Confirmar que o commit atual já serve como "snapshot" do PWA antes das exclusões, para qualquer necessidade de consulta de código.

## Passo a Passo para Limpeza
1. Excluir `index.html`.
2. Excluir `manifest.json`.
3. Excluir `service-worker.js`.
4. Excluir as pastas `css/` e `js/` inteiras.
5. Em `package.json`, remover qualquer script legado do frontend web.
6. Ajustar a base Supabase para permitir deep links da scheme `diamondx://` em vez das URLs web antigas.
