# Gerador de oportunidades para Daniel

## Objetivo

Criar uma plataforma pessoal que prepara, durante a madrugada, oportunidades de emprego, pautas para o LinkedIn e possíveis clientes. Pela manhã, Daniel revisa cada sugestão e decide o que aprovar, ajustar ou recusar. O painel distingue claramente uma ação preparada de uma ação efetivamente enviada ou publicada.

Daniel será o primeiro usuário e validará a utilidade do produto com candidaturas, publicações e contatos reais. Se a experiência gerar valor, a plataforma poderá ser oferecida a outras pessoas em situação semelhante.

## Direção de produto

- Tratar perfil, preferências, fontes, horários, decisões e integrações como dados de cada usuário, sem fixar nome, currículo ou cidade no código.
- Separar as três rotinas em módulos; cada pessoa poderá usar apenas as funções que lhe interessam.
- Guardar a origem e a versão dos fatos usados em cada currículo ou mensagem, para que o usuário entenda e corrija sugestões.
- Projetar a separação dos dados entre contas desde o início, mesmo que o piloto tenha apenas Daniel. Credenciais de plataformas externas devem ser protegidas e vinculadas à conta correta.
- Deixar explícito o que é uma sugestão, o que depende de aprovação e o que foi efetivamente executado. Aprovação por item será o padrão.
- Medir utilidade antes de pensar em cobrança: sugestões relevantes, candidaturas concluídas, tempo economizado, respostas recebidas e uso recorrente.
- Adiar cadastro público, planos pagos, cobrança e suporte multiusuário completo até o piloto provar valor.

## Perfil inicial

- Localização: Feira de Santana, Bahia.
- Preferência de vagas: trabalho remoto no Brasil ou presencial/híbrido em Feira de Santana.
- Formação: Análise e Desenvolvimento de Sistemas em andamento.
- Experiência: atendimento e suporte técnico, estoque/logística, rotinas administrativas e produção.
- Competências e estudos declarados no currículo: Power BI, SQL, Python, Excel, automação com n8n e inteligência artificial.
- Projetos declarados: gerador de anúncios com IA, bot de imagens via Telegram e dashboards analíticos.
- Fonte inicial: `Daniel De Jesus Alves.pdf`. Dados ainda precisam ser confirmados e enriquecidos antes de gerar currículos personalizados.

## Fluxo diário

1. À meia-noite, no fuso `America/Bahia`, o servidor inicia três rotinas independentes: vagas, conteúdo e prospecção.
2. Cada rotina registra origem, horário da coleta, resultado e eventuais erros. Uma falha não impede as demais.
3. O sistema elimina duplicatas e prepara sugestões para revisão. Não publica nem envia nada nesta etapa.
4. Pela manhã, o painel mostra o resumo do dia e as sugestões ordenadas por relevância.
5. Daniel pode **aprovar**, **pedir ajustes** ou **recusar** cada item. A decisão e o motivo opcional ficam no histórico.
6. Uma ação aprovada só recebe status **enviada** ou **publicada** após confirmação da plataforma de destino. Quando não houver integração adequada, o sistema entrega o material pronto e marca **aguardando ação manual**.
7. Uma rotina pode ser executada manualmente, e falhas ficam visíveis no painel.
8. Nas vagas com perguntas exibidas apenas após iniciar a candidatura, o usuário pode colá-las no painel. O sistema prepara respostas editáveis com base no perfil confirmado e sinaliza dados pessoais ou eliminatórios que exigem resposta do próprio usuário. No protótipo, essa ajuda usa regras locais e salva os rascunhos no navegador; uma geração por IA e a leitura de imagens ainda não estão conectadas.

## Módulo 1 — Vagas (primeiro MVP)

**Estado do piloto:** a busca manual real e a execução diária local estão implementadas para Gupy e Sólides (remoto no Brasil e cidade configurada), Casa do Trabalhador e SineBahia em Feira de Santana, Jobicy, Remotive e páginas configuradas de Lever/Greenhouse. A prova de cobertura está disponível no painel. O painel guarda as decisões no navegador e mostra a origem de cada vaga. Ver `BUSCA_DE_VAGAS.md` para uso e limites. O currículo por vaga e o envio de candidatura ainda não foram implementados. LinkedIn, Indeed e Glassdoor seguem fora da coleta automática.

**Próximo passo de desenvolvimento:** usar a prova de cobertura com 10 a 20 vagas recentes encontradas manualmente por Daniel e ajustar fontes e filtros conforme o resultado (ver andamento em `PROXIMO_PASSO_BUSCA_BRASIL.md`).

### Entrada

Fontes de vagas escolhidas conforme disponibilidade de API, feed ou outro acesso permitido. Cada fonte terá um conector separado. Filtros iniciais: remoto no Brasil ou Feira de Santana; estágio, assistente e júnior; data da publicação; área e requisitos.

### Priorização inicial

1. Suporte técnico, suporte a sistemas, implantação de software e suporte ao cliente em empresas de tecnologia.
2. Dados/BI júnior, relatórios e indicadores.
3. Processos/operações com dados e automação.
4. Automação com n8n e desenvolvimento júnior/estágio quando houver aderência demonstrável.

A nota de compatibilidade deve exibir evidências do currículo e dos projetos, requisitos atendidos, lacunas e motivo do ranking. A nota auxilia a triagem; não promete chance de contratação. Vagas repetidas são agrupadas; vagas expiradas não devem ser apresentadas como candidaturas novas.

### Currículo por vaga

Manter um **perfil mestre** com fatos confirmados, fontes e projetos. Para cada vaga selecionada, gerar uma versão do currículo que reorganiza e enfatiza fatos relevantes, além de uma mensagem curta quando útil. Nunca inventar experiência, duração, resultado, ferramenta ou nível de domínio. Daniel revisa a versão antes do envio. Guardar a versão usada em cada candidatura.

### Estados

`nova → em análise → currículo preparado → aprovada → enviada` ou `aguardando ação manual`; também `ajustes solicitados`, `recusada`, `expirada` e `erro`. Uma aprovação não equivale automaticamente a candidatura enviada.

## Módulo 2 — Conteúdo para LinkedIn

Gerar pautas a partir de projetos, aprendizados e temas relevantes para as áreas buscadas. Cada sugestão inclui objetivo, fonte da pauta quando externa, rascunho e horário sugerido. Daniel pode aprovar, editar, pedir outra opção ou recusar. Publicação agendada depende de integração oficial disponível e autorizada; o painel confirma quando a publicação ocorrer. Não automatizar navegação ou interação no site.

## Módulo 3 — Prospecção de clientes

Definir primeiro uma oferta concreta de automação e o perfil de empresa que se beneficiaria dela. Registrar empresa, fonte pública, necessidade observável e motivo da sugestão. Preparar abordagem individual, revisada por Daniel. Não enviar mensagens em massa nem iniciar conversas automáticas não solicitadas por WhatsApp. Qualquer envio futuro depende de canal e permissões adequados; respostas e pedidos para interromper contato devem ser respeitados.

## Painel

- Resumo da manhã: quantidade de vagas novas, vagas de alta aderência, pautas e empresas para avaliar.
- Três filas de revisão com filtros, detalhes, fonte e histórico.
- Ações: aprovar, pedir ajustes, recusar e, quando cabível, abrir a etapa manual.
- Status inequívocos: preparado, aprovado, agendado, aguardando ação manual, enviado/publicado, falhou.
- Registro de decisões para melhorar recomendações futuras.
- Cada vaga real deve manter seu link de origem para abrir a descrição completa. Cada cliente real deve manter um link verificável, como Google Maps ou site próprio, quando disponível. Exemplos sem fonte não devem simular links reais.
- A pauta de conteúdo terá texto e briefing de imagem. A geração de imagens por IA será uma integração própria, sujeita à revisão antes da publicação.

## Perfil e configurações do usuário

- **Meu currículo:** mostrar todos os dados da base mestra em seções editáveis, sem reproduzir o currículo inteiro como uma página HTML. Separar formação acadêmica, curso técnico e cursos/qualificações. Manter nome, cidade, telefone, e-mail, portfólio, CNH, resumo, experiências, competências, projetos e idiomas.
- Guardar e abrir o PDF original enviado pelo usuário para que ele possa conferir exatamente o documento de origem.
- A base mestra deve conservar todos os fatos relevantes do currículo original. A versão enviada a cada vaga é derivada dela e destaca apenas o que ajuda naquela candidatura, sem apagar informações da base.
- Permitir envio de um novo PDF para comparar com o perfil ou preparar sua substituição. A leitura deve propor diferenças para revisão antes de alterar o perfil mestre.
- Registrar pedidos em linguagem natural, como "adicione este curso", para futura análise pelo assistente. Não marcar pedidos como concluídos antes de atualizar os dados.
- **Configurações:** cargos, áreas, níveis, modalidades, cidade, fontes de vagas, serviços oferecidos, tipos e regiões de clientes, sinais de oportunidade, temas de conteúdo, estilo de imagem e instruções de escrita.
- **Conexão com LinkedIn:** cada usuário autoriza sua conta pelo fluxo oficial OAuth; o aplicativo solicita somente permissões necessárias para identificação básica e publicação. Segredos e tokens ficam no servidor, vinculados à conta correta. Ver `INTEGRACAO_LINKEDIN.md`.
- Guardar as preferências por usuário e usá-las na próxima coleta. Informar uma conta social no perfil não equivale a conectá-la.

## Sequência de desenvolvimento

1. Confirmar e enriquecer o perfil mestre; identificar as melhores fontes de vagas.
2. Construir o MVP de vagas: coleta agendada, deduplicação, filtros, explicação de compatibilidade e painel de revisão.
3. Adicionar geração e revisão de currículos personalizados e acompanhamento de candidaturas.
4. Adicionar pautas e agendamento de conteúdo.
5. Definir oferta comercial e adicionar pesquisa e revisão de prospects.
6. Integrar envios/publicações apenas onde houver acesso oficial, autorização e confirmação confiável de resultado.

## Critérios para considerar o MVP de vagas pronto

- Uma execução diária produz sugestões novas e não duplica vagas já conhecidas.
- Cada vaga mostra origem, link, data, local/modalidade, critérios de aderência e lacunas.
- Daniel consegue aprovar, pedir ajustes e recusar, sem perder o histórico.
- O currículo gerado usa somente fatos confirmados do perfil mestre.
- Falhas de coleta aparecem no painel e podem ser tentadas novamente.
- O painel nunca chama uma candidatura de enviada sem confirmação do envio.

## Informações a confirmar

- Previsão de conclusão da graduação e disponibilidade para estágio.
- Tecnologias efetivamente utilizadas em cada projeto, links e resultados verificáveis.
- Tipos de contrato aceitos, faixa salarial desejada e disponibilidade de horário.
- Fontes de vagas prioritárias e preferência entre as trilhas de suporte/implantação e dados/BI.
- Oferta de automação a ser vendida e perfil inicial de cliente.
