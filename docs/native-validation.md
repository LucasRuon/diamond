# Validação Manual - Expo Go

Use esta lista para validar se todas as funcionalidades do aplicativo foram corretamente migradas para a versão React Native:

## 1. Autenticação
- [ ] Login com e-mail e senha.
- [ ] Bloqueio ao inserir senha errada (exibe Toast).
- [ ] A sessão continua ativa se eu fechar e abrir o Expo Go de novo.
- [ ] Criação de nova conta (verificar se salva Nome, Email, CPF, WhatsApp).
- [ ] "Esqueci a Senha" mostra estado de sucesso após o envio.

## 2. Roteamento por Perfil
- [ ] Entrar com conta "Aluno" e visualizar as tabs: Início, Treinos, Planos, Presença, Perfil.
- [ ] Entrar com conta "Admin" e visualizar as tabs exclusivas: Usuários, Treinos, Relatórios, etc.
- [ ] Entrar com conta "Responsável" e visualizar a tab "Alunos".

## 3. Design System
- [ ] A fonte "Abnes" (logo) aparece em todas as telas (`PageHeader`).
- [ ] Os botões reagem ao toque.
- [ ] Notificações em Toast sobem na tela para informar sucesso ou erro.
- [ ] Não há sobreposição de conteúdo no entalhe do iPhone (Safe Area).

## 4. Recursos Nativos
- [ ] **Admin**: Apertar "Ler QR Code do Aluno" solicita permissão de câmera.
- [ ] A câmera abre em tela cheia e escaneia o QR.
- [ ] Ao escanear, o modal fecha automaticamente e um toast de sucesso aparece.
