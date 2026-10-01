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

## Configuração do aplicativo

- Criar um aplicativo em https://www.linkedin.com/developers/apps chamado Radar e associar uma Página do LinkedIn aceita pelo portal.
- Landing page: `https://radar.setupdja.website/`.
- Privacy policy URL: `https://radar.setupdja.website/privacidade.html`.
- Adicionar um logo quadrado de pelo menos 100 px, no formato aceito pelo portal.
- Em **Auth**, cadastrar exatamente `https://app-radar.setupdja.website/api/linkedin/callback` como URL de retorno.
- Em **Products**, ativar **Sign In with LinkedIn using OpenID Connect** e **Share on LinkedIn**.
- Copiar Client ID e Client Secret para **Meu perfil → LinkedIn** no Radar. Nunca enviar o segredo por mensagem.
- Clicar em **Conectar LinkedIn** e conceder as permissões no site do LinkedIn.

## Estado do protótipo

O fluxo de conexão, armazenamento criptografado do token e publicação com imagem estão implementados no servidor. O botão de conexão é habilitado após cadastrar o aplicativo. A publicação automática considera apenas posts aprovados pessoalmente; alterar texto, imagem ou horário exige nova aprovação. Os testes locais usam respostas simuladas. O teste real de autorização e postagem depende da criação do aplicativo LinkedIn e da ativação dos produtos.

Esta versão é para um único usuário. Para vender o produto a outras pessoas, será necessário separar as contas, credenciais e tokens por usuário.

## Fontes oficiais

- https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow
- https://learn.microsoft.com/en-us/linkedin/shared/authentication/getting-access
- https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2
- https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api
