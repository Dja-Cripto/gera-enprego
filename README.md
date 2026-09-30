# Radar

Portal pessoal de oportunidades. Um robô que trabalha para você em três frentes:

- **Vagas:** busca diária em Gupy, Sólides, Empregos.com.br, Pandapé, Casa do Trabalhador, SineBahia, vagas remotas e Google Vagas. Compara cada vaga com o seu currículo e guarda suas candidaturas.
- **Clientes:** campanhas de prospecção. O Radar encontra empresas no Google Maps por nicho e região, dá uma nota com os motivos e escreve a primeira mensagem de WhatsApp ou e-mail. Quem envia é você.
- **Publicações:** posts para o LinkedIn escritos com IA a partir do que você fez de verdade. Inclui pauta semanal automática, cards e fotos, e lembrete por e-mail na hora de publicar.

## Como rodar
Requisito: [Node.js](https://nodejs.org) 18 ou mais novo. Não há dependências para instalar.

- **Windows:** dê dois cliques em `iniciar-radar.bat`.
- **Outros sistemas:** rode `node server.mjs`.

Depois abra http://localhost:8765.

## Configuração (em Meu perfil)
| Recurso | Para quê | Onde conseguir |
|---|---|---|
| SerpApi | Google Vagas e busca de empresas no Google Maps | serpapi.com (250 buscas/mês grátis) |
| OpenCode Go (ou outro serviço compatível com OpenAI) | Escrever posts e o banco de histórias | opencode.ai |
| Pixabay ou Pexels | Fotos reais para os posts | pixabay.com/api/docs ou pexels.com/api |
| Gmail + senha de app | E-mail aos clientes e lembretes dos posts | myaccount.google.com/apppasswords |

As chaves ficam só no computador de quem usa, no arquivo `.radar-jobs-state.json`, que não vai para o GitHub.

## Acesso protegido
- **Primeira abertura:** o Radar pede para criar usuário e senha. Isso só é permitido no próprio computador onde ele roda; pela internet, a tela recusa.
- **Senha:** fica guardada apenas como hash (scrypt) em `.radar-auth.json`, que não vai para o GitHub.
- **Sessão:** cookie protegido (HttpOnly, SameSite, Secure em HTTPS). Dura 12 horas, ou 30 dias em "Este computador é meu".
- **Tentativas erradas:** depois de 5, o acesso fica bloqueado por 15 minutos, e o bloqueio aumenta se continuar.
- **Opcional:** código de 6 dígitos por e-mail ao entrar de um computador novo (Meu perfil › Segurança).
- **Esqueceu a senha:** rode `definir-senha.bat` no computador do servidor.

## Dados pessoais
- `perfil-pessoal.js` (opcional, fora do GitHub) preenche o currículo na primeira abertura.
- Sem ele, o Radar começa em branco e você preenche em **Meu currículo**.

## Documentação
- `BUSCA_DE_VAGAS.md`: fontes e regras de triagem.
- `CLIENTES.md`: prospecção.
- `PUBLICACOES.md`: LinkedIn no piloto automático.
- `PLANO_DO_PROJETO.md`: visão do produto.
