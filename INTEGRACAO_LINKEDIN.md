# Conexão oficial com LinkedIn

## Experiência desejada

1. O usuário abre **Configurações → Conexão com LinkedIn** e clica em **Conectar LinkedIn**.
2. A plataforma o direciona para a autorização oficial do LinkedIn. Login e senha são digitados somente no LinkedIn.
3. O LinkedIn retorna à plataforma após o consentimento. O painel mostra a conta vinculada, permissões concedidas e estado da conexão.
4. Ao aprovar uma pauta, o usuário escolhe o horário; a publicação agendada usa a autorização da própria conta. O painel só mostra **publicado** após confirmação da API.
5. O usuário pode desconectar a conta e solicitar nova autorização quando o token expirar ou for revogado.

## Permissões

- `openid profile`: identificar a conta e obter dados básicos, como nome e foto.
- `email`: obter e-mail quando disponibilizado pelo LinkedIn. Pode ser opcional para o produto.
- `w_member_social`: criar posts em nome do usuário autenticado.
- O fluxo público de OpenID Connect não dá acesso a todo o histórico profissional, experiências ou cursos do perfil do LinkedIn. O currículo mestre continua sendo mantido pelo usuário no Radar.
- Leitura de posts e interações do membro exige permissões diferentes e restritas; não deve ser prometida nesta fase.

## Implementação necessária

- Criar um aplicativo no LinkedIn Developer Portal e habilitar os produtos **Sign in with LinkedIn using OpenID Connect** e **Share on LinkedIn**.
- Registrar uma URL HTTPS de retorno do servidor. O protótipo estático em `localhost` ainda não dispõe dessa URL nem de um servidor de aplicação.
- Implementar OAuth 2.0 Authorization Code Flow no servidor: iniciar conexão, gerar e validar `state`, receber o `code` e trocá-lo por token. Nunca colocar o `client_secret` no JavaScript ou no navegador.
- Associar cada token à conta correta no banco, com criptografia em repouso, controle de acesso, expiração e possibilidade de desconexão. Não usar `localStorage` para tokens.
- Conferir escopos efetivamente concedidos e falhas de autorização antes de habilitar agendamento/publicação.
- Usar a API oficial de posts; registrar resposta, identificador da publicação, falhas e necessidade de reconexão.
- Manter aprovação humana por post. Conectar a conta não significa autorizar publicações sem revisão.

## Estado do protótipo

A tela de conexão está desenhada, mas o botão permanece desabilitado até existir o aplicativo de desenvolvedor e o servidor seguro. O campo de URL pública do perfil é apenas uma referência; ele não vincula a conta.

## Fontes oficiais

- https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow
- https://learn.microsoft.com/en-us/linkedin/shared/authentication/getting-access
- https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2
- https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api
