# Busca de vagas do piloto

## Como usar

1. Na pasta do projeto, dê dois cliques em `iniciar-radar.bat` (ou execute `node server.mjs`).
2. Abra `http://localhost:8765/` e entre em **Configurações**. Salve os cargos, a cidade, as modalidades e a data de publicação desejada (últimas 24 horas, 3, 7, 14 ou 30 dias; padrão: 7). Ao salvar, o servidor passa a usar essas preferências também na busca automática da meia-noite.
3. Em **Vagas**, clique em **Buscar vagas agora**. A busca usa e salva os valores que estiverem no formulário de Configurações, mesmo que você não tenha clicado em Salvar. O painel mostra primeiro a quantidade publicada dentro do prazo escolhido e depois quantas passaram pela triagem de nível, local e área.
4. Abra uma vaga para conferir descrição, fonte original, requisitos e link de candidatura quando a fonte o fornecer.
5. Revise e classifique a vaga. Uma vaga já aprovada ou recusada mantém sua decisão na busca seguinte.

## Fontes conectadas

O robô transforma cada linha de **Cargos e áreas de interesse** em várias buscas. Por exemplo, “suporte técnico” também busca “analista de suporte”, “help desk”, “service desk” e “técnico de informática”. Se “estágio” estiver nos níveis, busca também estágios em TI, ADS e dados. São até 24 termos por execução.

- **Gupy (portal público do candidato)**: é a principal fonte brasileira. O robô lê todas as vagas abertas na cidade configurada, sem depender do termo, e deixa a triagem para o Radar. Faz também uma busca de vagas remotas para cada termo. A data é a de publicação informada pela Gupy, e o link leva ao formulário da empresa. Esta é a busca pública do candidato, não a API empresarial da Gupy.
- **Sólides Vagas (portal público)**: lê todas as vagas da cidade (no formato “Feira de Santana - BA”, o mesmo do site) e busca vagas remotas para cada termo. A API aceita no máximo 20 vagas por página e ordena das mais novas para as mais antigas; o robô para de paginar quando passa do período escolhido. Quando a empresa cadastra perguntas do formulário, elas aparecem nos detalhes da vaga.
- **Empregos.com.br**: lê as páginas públicas de vagas da cidade (`/vagas/oportunidades-em-<cidade>-<uf>`), permitidas pelo robots.txt do site. O contrato do site não proíbe esse acesso. Os dados vêm do JSON que a própria página entrega. O robô só mantém as vagas da cidade configurada e as remotas.
- **Pandapé (InfoJobs)**: páginas "Trabalhe conosco" de empresas que usam o Pandapé. Basta adicionar o endereço da empresa em Meu perfil > Páginas de carreiras (a da Tel já vem incluída). O portal central do InfoJobs não está conectado, porque os termos de uso dele ainda não foram verificados.
- **Casa do Trabalhador de Feira de Santana**: lista oficial da prefeitura. A página não informa data. O Radar registra quando viu cada vaga pela primeira vez e mostra “Sem data na fonte • visto em …”. Depois do prazo escolhido, a vaga sai da lista de novas, mesmo que continue publicada.
- **SineBahia**: página oficial de Vagas do Dia da Setre, apenas a seção de Feira de Santana. Usa a data do boletim, que não é necessariamente a data de criação da vaga.
- **Jobicy e Remotive**: APIs públicas de vagas remotas internacionais. “Anywhere” não confirma contratação no Brasil.
- **Lever e Greenhouse**: páginas públicas de carreiras que você adiciona em Configurações, uma URL por linha.

Em vagas Greenhouse, o painel também pode consultar as perguntas adicionais públicas do formulário. Perguntas exibidas apenas após login ou em etapas posteriores podem não aparecer nessa consulta; nesses casos, o usuário pode colá-las manualmente na ajuda da candidatura.

## Período da busca

O período configurado em **Meu perfil** é o que o robô usa na busca automática da meia-noite. Na página **Vagas**, ao lado do botão **Buscar vagas agora**, é possível escolher outro período (24 horas, 3, 7, 14 ou 30 dias) só para aquela busca, sem mudar o perfil.

## Candidaturas

A candidatura é feita pela pessoa no site da vaga. No detalhe de cada vaga:

- **Ver vaga e me candidatar** abre o anúncio original.
- **Já me candidatei** registra a candidatura com data. A vaga vai para o Histórico e o servidor passa a excluí-la das próximas buscas, inclusive quando o mesmo anúncio aparece em outra fonte (mesma empresa, cargo e cidade).
- **Salvar para depois** guarda a vaga no filtro "Salvas para depois", sem tirá-la das buscas.
- **Não tenho interesse** descarta a vaga e também a exclui das próximas buscas.
- **Desfazer** e **Voltar para análise** revertem a decisão.

As decisões ficam no navegador e no servidor (`.radar-jobs-state.json`, campo `decisions`).

## Compatibilidade mínima (remoto x cidade)

As vagas remotas concorrem com o Brasil inteiro, por isso o filtro delas é mais rigoroso. Em Meu perfil é possível ajustar os dois limites.

- **Vagas remotas:** precisam de boa correspondência de área. Quando o anúncio cita 3 requisitos ou mais, a vaga só entra se pelo menos 70% deles constarem no currículo (padrão). Se o anúncio cita 1 ou 2 requisitos, todos precisam constar.
- **Vagas na cidade:** quando o anúncio cita 3 requisitos ou mais, basta 40% (padrão). Também é possível mostrar todas as vagas da área.

As vagas cortadas por esse filtro aparecem no diagnóstico como "com poucos requisitos do seu currículo" e na prova de cobertura com esse motivo.

## Comparação com o currículo

O servidor recebe o currículo mestre (tela **Meu currículo**) a cada busca e sempre que você salva o perfil ou as configurações. Para cada vaga, ele:

- aponta as experiências relacionadas ao cargo, com empresa e período;
- lista os requisitos citados no anúncio (Power BI, SQL, Excel, suporte técnico, atendimento, estoque, ERP, inglês, CNH, escolaridade…) e diz quais constam no currículo e onde;
- mostra em “O que conferir” o que o anúncio pede e não aparece no currículo, além de experiência mínima exigida.

O cartão mostra, por exemplo, “5 de 6 requisitos citados constam no seu currículo”. Isso ajuda a priorizar; não é probabilidade de contratação.

## Fontes extras (com chave)

Em Meu perfil > Fontes extras de vagas é possível ativar três serviços. As chaves ficam só no servidor local (`.radar-jobs-state.json`) e nunca no navegador.

- **Google Vagas via SerpApi:** reúne anúncios de LinkedIn, Indeed, Glassdoor, InfoJobs, Catho e sites de empresas. O plano grátis tem 250 buscas por mês.
  - Cada execução faz no máximo o número de buscas configurado (padrão 4).
  - O resultado fica guardado por 20 horas, inclusive em disco, para não gastar a cota em buscas repetidas.
  - O link aberto prioriza o site de origem (empresa, Gupy etc.) em vez do LinkedIn.
- **Adzuna:** chave grátis. A cobertura do Brasil será confirmada na primeira busca; se falhar, a falha aparece no diagnóstico.
- **Jooble:** chave grátis sob pedido.

Quando a mesma vaga vem de uma fonte de origem e de um agregador, o Radar fica com a de origem e mostra o agregador em "Também em".

## Vaga adicionada por link

Na página Vagas, "+ Adicionar por link" aceita vagas de qualquer site, inclusive o LinkedIn. Nos sites que o robô pode ler, o título é lido da página. No LinkedIn, Indeed e Glassdoor, a pessoa informa o cargo e a empresa. A vaga entra na lista com a comparação com o currículo e segue o mesmo fluxo de candidatura.

## Triagem

- **Região e modalidade**: vagas remotas precisam ser brasileiras ou aceitar o Brasil. Vagas presenciais e híbridas precisam ser da cidade configurada, e cada modalidade respeita a caixa marcada em Configurações.
- **Nível**: cargos sênior, pleno (inclusive “PL”), coordenador, supervisor, gerente e níveis III/IV são descartados, exceto quando o título também diz júnior, estágio ou trainee. “Especialista” não é descartado, porque muitas empresas usam esse nome para cargos de entrada em atendimento. Estágios só aparecem se “estágio” estiver em Níveis de interesse.
- **Área**: a vaga vira **boa correspondência** quando o título bate com as áreas escolhidas (suporte, TI, sistemas, dados, administrativo, processos ou estágio em tecnologia). Vira **possível correspondência** quando é próxima da sua experiência (atendimento, SAC, estoque, logística, cadastro, produção, desenvolvimento) ou quando a descrição pede Power BI, SQL, suporte técnico ou Excel avançado.
- **Vagas restritas**: só são excluídas as vagas exclusivas para pessoas com deficiência. Vagas que apenas aceitam PCD continuam na lista.
- **Repetidas**: a mesma empresa, cargo e cidade em fontes diferentes viram um único cartão com a tag “Também em …”.
- **Novas**: o servidor guarda quando viu cada anúncio pela primeira vez, e só vagas inéditas recebem a tag “Nova”. Uma vaga já decidida que não aparece mais recebe a tag “Não apareceu na última busca”.
- **Recência**: vagas sem data confirmada não entram na janela escolhida.

A tela informa quantas vagas foram excluídas por cada motivo. A triagem não representa probabilidade de contratação.

## Fontes consultadas e prova de cobertura

Em **Vagas → Fontes consultadas na última busca**, uma tabela mostra para cada fonte quantos anúncios foram lidos, quantos foram para revisão e se houve falha. Uma fonte que bloquear o acesso aparece como “Falhou” e não é tratada como zero vagas.

Em **Vagas → Prova de cobertura**, cole as vagas que você encontrou pesquisando por conta própria, uma por linha: o link e, se quiser, cargo e empresa. O Radar compara com tudo o que leu na última busca, inclusive o que descartou, e informa para cada linha:

- **Encontrada e recomendada**: a vaga está na lista de revisão.
- **Encontrada, mas descartada**: a vaga foi lida, e a tabela diz o motivo (nível, área, prazo…). Esse resultado indica o filtro a ajustar.
- **Não encontrada**: a vaga não veio de nenhuma fonte, e a tabela explica o provável motivo, por exemplo uma fonte que não está conectada ou um cargo que não está nas buscas.

O painel apresenta título adaptado e resumo factual em português para as vagas coletadas. A descrição integral permanece no idioma original e é identificada como tal; uma tradução integral automática ainda depende de um serviço de tradução confiável. O resumo não substitui a leitura dos requisitos completos.

## Execução diária e dados

Depois da primeira busca manual, o servidor guarda as preferências de busca, os últimos resultados e o histórico de anúncios vistos em `.radar-jobs-state.json`. Enquanto **o servidor estiver ligado**, uma nova consulta roda à meia-noite no fuso `America/Bahia`. Ao abrir ou atualizar o painel, os resultados mais novos são importados. As decisões e o currículo continuam guardados no navegador neste protótipo. Não há conta de usuário ou sincronização entre dispositivos.

Se o computador ou servidor estiver desligado à meia-noite, a busca é feita quando o servidor for iniciado de novo, desde que a última tenha mais de 20 horas. A próxima evolução para uso contínuo é hospedar o serviço e transferir perfil, decisões e credenciais para uma base protegida por usuário.

## Limites atuais

- LinkedIn, Indeed, Glassdoor, InfoJobs e Catho não fazem parte da coleta automática, porque os termos de uso dessas plataformas restringem esse tipo de acesso. A prova de cobertura mostra quantas vagas dessas fontes a Gupy e a Sólides também trazem.
- Gupy e Sólides são consultadas pelas buscas públicas que os próprios portais usam. Elas não têm contrato de estabilidade, e uma mudança no site pode interromper o conector. Quando isso acontecer, a falha aparece na tabela de fontes.
- O sistema não envia candidaturas e ainda não gera PDF personalizado. Aprovar uma sugestão não equivale a se candidatar.
- Uma falha na internet ou em uma fonte é mostrada no painel. Um erro não é convertido em resultado fictício.

## Documentação das fontes

- https://jobicy.com/jobs-rss-feed
- https://remotive.com/remote-jobs/api
- https://github.com/lever/postings-api
- https://developers.greenhouse.io/job-board.html
- https://www.ba.gov.br/trabalho/280/vagas-do-dia-sinebahia
- https://portal.gupy.io/ (busca pública usada pelo portal: `/api/job-search/jobs`)
- https://vagas.solides.com.br/ (busca pública usada pelo portal: `/api/vacancies`)
- https://feiradesantana.ba.gov.br/servico.asp?id=32&link=casadotrabalhador/s14/informativo.asp
