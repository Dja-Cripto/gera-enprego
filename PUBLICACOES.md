# Módulo Publicações (LinkedIn no piloto automático)

## Configurar (uma vez)
1. **Meu perfil › Inteligência artificial e imagens**
   - Cole a chave do OpenCode Go e clique em **Salvar**. O Radar testa a conexão sozinho.
   - Modelos padrão: `kimi-k3` para os posts e `deepseek-v4.1-flash` para tarefas rápidas. Em **Comparar modelos**, escreva o mesmo post com 2 a 5 modelos e escolha o de que mais gostar.
   - **Pexels** (opcional, grátis em pexels.com/api) serve para fotos reais de banco. Os cards com texto não precisam de chave.
2. **Publicações › Entrevista**: responda as 10 perguntas, escrevendo ou pelo microfone (ditado grátis do Chrome ou Edge). Depois clique em **Salvar e montar banco de histórias**.
3. **Meu perfil › Voz e publicações**: defina público, tom, dias, horário, tipos de post, chamada e exemplos de posts de que você gosta. Deixe ligado:
   - **Piloto automático**: escreve os posts quando falta para a próxima semana;
   - **Receber por e-mail**: usa o Gmail configurado em Clientes.

## Rotina (cerca de 10 minutos por semana)
- **Automático:** quando faltam posts para os próximos 8 dias, o robô escreve a semana e manda um e-mail com a pauta. A verificação roda a cada 10 minutos, com o servidor ligado.
- **Você:** abre **Publicações › Para aprovar**, lê, ajusta (ou pede "mais curto", "mais pessoal"…) e aprova.
- **Na hora marcada:** o post chega no seu e-mail com o texto pronto e o link "Publicar direto", que abre o LinkedIn com o texto preenchido. Anexe a imagem, publique e marque **Já publiquei**.
- **Opcional:** o **Check-in da semana** tem 3 perguntas, e o próximo post usa as respostas. Se você pular a semana, o robô usa o banco de histórias.
- Com **Aprovar sozinho** ligado, nem a aprovação é necessária.

## Imagens (ordem de preferência)
1. **Seu print ou foto:** a IA sugere qual print tirar. É o que mais passa confiança.
2. **Card com texto:** gerado no navegador com as cores do Radar, sem custo. Use **Baixar card (PNG)**.
3. **Foto de banco (Pexels):** busca por palavras em inglês; você escolhe entre 12 fotos.

## Regras
- A IA só usa fatos do currículo, da entrevista, dos check-ins e do que o Radar observou (habilidades mais pedidas nas vagas, nichos das campanhas). Em cada post, "Fatos usados pela IA" mostra de onde saiu cada fato.
- Nada é publicado sem você. A publicação automática exige a API oficial do LinkedIn (próxima etapa).

## Arquivos
- `posts.mjs`: perguntas, cliente de IA (formatos OpenAI, Anthropic e responses), banco de histórias, agenda, escrita, Pexels e e-mail de lembrete.
- `posts-ui.js`: tela Publicações e os painéis de IA e de voz no Meu perfil.
- Os dados ficam em `.radar-jobs-state.json`, em `posts` (voice, interview, stories, diary, items). As chaves ficam só em `integrations`.

## Próximos passos
- Publicação automática pela API oficial do LinkedIn. Precisa de um app em developer.linkedin.com com o produto "Share on LinkedIn": Client ID e Client Secret.
- Usar a IA também na ficha da oferta e nas mensagens de Clientes.
- Vagas no exterior.
