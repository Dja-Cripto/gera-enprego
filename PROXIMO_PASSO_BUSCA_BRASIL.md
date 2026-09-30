# Próximo passo — ampliar a busca de vagas no Brasil

## Andamento (29/09/2026)

- **Feito — conectores brasileiros:** Gupy (todas as vagas da cidade e remotas por termo), Sólides (remotas e da cidade), Casa do Trabalhador de Feira de Santana (com data de “primeira vez visto”) e SineBahia. Ver `sources-br.mjs`.
- **Feito — buscas por várias expressões:** cada cargo configurado gera variações; até 24 termos por execução.
- **Feito — triagem e painel:** faixas “boa” e “possível” correspondência, descarte de pleno/sênior, regras por modalidade, agrupamento de duplicatas entre fontes, tag “Nova” com histórico no servidor e tabela de fontes com falhas visíveis.
- **Feito — rotina diária:** a busca perdida é feita ao ligar o servidor; `iniciar-radar.bat` abre o painel.
- **Feito — ferramenta da prova de cobertura:** Vagas → Prova de cobertura.
- **Falta — Entrega 1 com dados reais:** Daniel coletar de 10 a 20 vagas recentes encontradas manualmente, colar na prova de cobertura e ajustar filtros ou fontes conforme o resultado.
- **Falta — Entrega 2:** avaliar outras fontes brasileiras (por exemplo, páginas de carreiras de empresas locais e outros ATS com página pública) com base nas vagas “não encontradas”.

## Objetivo desta etapa

Fazer o Radar encontrar vagas recentes que Daniel encontra hoje ao pesquisar manualmente, especialmente remotas para residentes no Brasil e presenciais ou híbridas em Feira de Santana. O resultado deve mostrar o anúncio original, a data verificada, o motivo da recomendação e o estado da candidatura. Esta etapa trata de **descoberta e triagem**; não envia candidaturas.

## O problema atual

Jobicy e Remotive entregam principalmente vagas internacionais. Uma vaga marcada como “Anywhere” não prova que aceita candidatos no Brasil. O SineBahia já foi conectado para a seção de Feira de Santana, mas cobre apenas parte do mercado local. Portanto, a quantidade encontrada pelo Radar não representa o total de vagas disponíveis para Daniel.

## Fontes prioritárias

| Prioridade | Fonte | Caminho de descoberta | O que validar |
| --- | --- | --- | --- |
| 1 | LinkedIn Jobs | Busca pública por cargo, cidade, remoto e data; links de anúncios encontrados por mecanismo de busca ou alertas do próprio LinkedIn | Se o link abre, data real, local, exigência de residência e destino da candidatura |
| 1 | Indeed Brasil | Busca pública e alertas por cargos e cidades | Mesmo anúncio em várias páginas, data, empresa e URL final |
| 1 | Gupy | Portal público de vagas e páginas públicas das empresas | Data, cidade, modalidade, requisitos e etapas de candidatura |
| 2 | Glassdoor Brasil | Busca pública e alertas | Cobertura, duplicatas e link para a vaga da empresa |
| 2 | SineBahia / Casa do Trabalhador | Boletins públicos oficiais por cidade | Data do boletim, cidade e instruções para atendimento |
| 3 | Páginas das empresas | APIs e páginas públicas de carreiras, como Lever e Greenhouse | Data de publicação e formulário original |

## Como a coleta deve funcionar

1. **Construir um conjunto de conferência.** Daniel separa 10 a 20 vagas recentes que ele mesmo encontrou nas fontes acima. Guardar URL, cargo, cidade, modalidade e data. Isso será a referência para medir se o Radar está procurando nos lugares certos.
2. **Pesquisar por várias expressões, não por uma frase única.** Criar buscas separadas para suporte técnico, suporte a sistemas, implantação, atendimento em tecnologia, assistente administrativo, dados/BI e estágio em ADS. Combinar cada busca com `Feira de Santana`, `Bahia`, `remoto Brasil` e o prazo configurado.
3. **Usar descoberta por busca web quando for útil.** Consultar um serviço de pesquisa apropriado com operadores como `site:linkedin.com/jobs/view/`, `site:br.indeed.com/viewjob`, `site:portal.gupy.io` e `site:glassdoor.com.br/Job/`. Isso encontra URLs públicas, mas a data indicada pelo buscador não é suficiente: o Radar precisa verificar o anúncio na fonte.
4. **Criar um conector por fonte.** Cada conector recebe termos, local e prazo; devolve URL, título, empresa, cidade, modalidade, descrição, data e estado de verificação. Preferir APIs, feeds e alertas próprios da fonte quando disponíveis. Para páginas públicas, testar extração direta ou navegação por navegador automatizado em um protótipo isolado. Login, CAPTCHA e bloqueio não devem ser tratados como sucesso silencioso; a fonte deve aparecer como indisponível.
5. **Verificar cada vaga.** Abrir o anúncio original, confirmar se continua ativo, distinguir data de publicação de data de atualização, identificar restrições de país, idioma, escolaridade, experiência e modalidade. Quando a data ou elegibilidade não puder ser confirmada, colocar em uma fila separada de “verificar”, sem afirmar que a vaga é recente ou aceita brasileiros.
6. **Agrupar duplicatas.** O mesmo emprego pode aparecer no LinkedIn, Indeed, Glassdoor e na página da empresa. Agrupar por URL final da empresa e, como apoio, empresa + cargo + cidade. Mostrar todas as fontes, mas apenas um cartão de revisão.
7. **Classificar sem esconder oportunidades plausíveis.** Separar `boa correspondência`, `possível correspondência` e `fora do perfil`. Explicar os requisitos encontrados e as diferenças em relação ao currículo. Não descartar uma vaga apenas porque o título não contém uma palavra exata. Excluir restrições inequívocas, como senioridade incompatível ou vaga exclusiva para um perfil que não foi informado pelo usuário.
8. **Guardar histórico.** Registrar quando a vaga foi vista pela primeira vez, quando foi verificada por último e a decisão de Daniel. Uma coleta diária não deve reapresentar a mesma vaga como nova. Se o anúncio desaparecer, marcar como possivelmente encerrado.
9. **Mostrar a cobertura real.** O painel deve informar quais fontes foram consultadas, quais falharam, quantos anúncios recentes foram verificados, quantos foram agrupados e quantos exigem conferência manual. Nunca chamar “total de vagas do Brasil” a contagem recebida de duas fontes internacionais.

## Ordem de implementação

### Entrega 1 — prova de cobertura

- Coletar a amostra manual de Daniel.
- Fazer buscas de teste para os mesmos cargos, Feira de Santana e remoto Brasil, com janelas de 1, 3 e 7 dias.
- Comparar fonte por fonte quantas vagas da amostra foram encontradas e por que as demais não apareceram.
- Escolher o método de acesso de cada fonte com base em resultados reais, custo e estabilidade.

**Aceite:** apresentar uma tabela com vagas da amostra encontradas, não encontradas, duplicadas e motivo verificável de cada falha. Não avançar com uma fonte que produz apenas números altos e vagas pouco úteis.

### Entrega 2 — conectores brasileiros

- Integrar as fontes que passaram na prova, começando por Gupy e Indeed ou pelo mecanismo de descoberta que efetivamente localizar a amostra.
- Manter SineBahia e adicionar a Casa do Trabalhador de Feira como fonte local, distinguindo data do boletim de data da vaga.
- Implementar limites de consulta, cache, tratamento de erros e verificação de links.

**Aceite:** resultados recentes em português, com link para a origem, local/modalidade e data correta ou aviso explícito de que a data não foi confirmada.

### Entrega 3 — triagem e painel

- Deduplicar anúncios entre fontes.
- Melhorar a análise dos requisitos usando o currículo mestre, inclusive formação técnica, cursos, experiência administrativa e projetos.
- Mostrar motivo da recomendação e lacunas, sem inventar aderência percentual ou probabilidade de contratação.
- Preservar aprovações, recusas e histórico entre buscas.

**Aceite:** Daniel consegue revisar uma lista útil sem encontrar a mesma vaga repetidamente nem vagas antigas apresentadas como novas.

### Entrega 4 — rotina diária

- Executar a coleta no horário configurado pelo usuário.
- Mostrar o resumo da manhã e registrar falhas por fonte.
- Monitorar mudanças nas páginas e ajustar conectores quando um site mudar.

**Aceite:** três execuções consecutivas apresentam resultados e falhas com clareza, sem duplicar decisões já tomadas.

## Decisões técnicas e limites a registrar

- **Busca como no Google:** é viável como camada de descoberta de links. Para execução automática diária em um produto, será preciso um serviço de busca adequado ou outra fonte que permita consultas programáticas. Não se deve presumir que a data do índice de busca seja a data da vaga.
- **Navegador automatizado:** tecnicamente pode visitar páginas e ler anúncios públicos, mas é mais frágil: mudanças no site, bloqueios e limites de uso podem interromper a coleta. Cada conector precisa de teste e manutenção. Não colocar senha do usuário no código nem tratar desafios de acesso como dados de vaga.
- **LinkedIn, Indeed e Glassdoor:** seus termos atuais restringem coleta automatizada sem autorização. Registrar esse risco antes de escolher qualquer conector para um produto público. Alertas e links fornecidos pelo usuário podem ser uma entrada complementar.
- **Gupy e portais brasileiros:** a API empresarial da Gupy exige credenciais da empresa. O portal de vagas deve ser avaliado separadamente como fonte pública para candidatos; não confundir as duas coisas.
- **Privacidade:** quando houver contas de vários usuários, isolar preferências, currículo, histórico e eventuais credenciais por pessoa. A coleta nunca deve publicar o currículo nem se candidatar sem a aprovação prevista no produto.

## Resultado esperado

Ao fim desta etapa, Daniel abre o Radar e vê oportunidades brasileiras recentes que fazem sentido para sua experiência, com fontes e datas verificáveis. O sucesso será medido pela capacidade de encontrar vagas que ele também consegue achar manualmente, não pelo total bruto de anúncios consultados.

## Referências das fontes

- SineBahia: https://www.ba.gov.br/trabalho/280/vagas-do-dia-sinebahia
- Casa do Trabalhador de Feira de Santana: https://feiradesantana.ba.gov.br/servico.asp?id=32&link=casadotrabalhador/s14/informativo.asp
- Termos do LinkedIn: https://www.linkedin.com/help/linkedin/answer/a1341387
- Termos do Indeed: https://www.indeed.com/legal
- Termos do Glassdoor: https://www.glassdoor.com/about/terms-2022-12-01/
- API empresarial da Gupy: https://developers.gupy.io/
