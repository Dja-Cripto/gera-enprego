# Módulo Clientes (prospecção)

O robô encontra empresas, pesquisa e escreve a primeira mensagem. **Quem envia é você**: WhatsApp com um clique ou e-mail aprovado um a um.

## Como usar
1. **Meu perfil › Fontes extras**: a chave do SerpApi (a mesma do Google Vagas) precisa estar salva.
2. **Meu perfil › E-mail para prospecção** (opcional, para enviar direto do Radar):
   - ative a verificação em duas etapas na Conta Google;
   - crie uma *senha de app* em https://myaccount.google.com/apppasswords;
   - cole o Gmail e a senha de app, preencha a assinatura e o limite diário (recomendado: 20).
3. **Clientes › + Nova campanha**: descreva o que vende → *Montar ficha da oferta* → revise a ficha → escolha nichos, cidade e raio → *Criar campanha*.
4. **Buscar empresas**: cada nicho usa 1 consulta do SerpApi por página (até 20 empresas). O resultado fica guardado por 7 dias.
5. Para cada empresa: leia o motivo da nota, ajuste a mensagem e
   - **Abrir no WhatsApp** → envie no WhatsApp → volte e clique em **Enviei**; ou
   - **Enviar e-mail** (ou *Abrir no meu e-mail*, se o Gmail não estiver configurado).
6. Acompanhe: Contatada → Respondeu → Reunião → Proposta → Fechou/Não fechou. O Radar lembra do retorno 4 dias depois do contato (filtro *Retornos para hoje*).
7. **Não quer contato** bloqueia a empresa e o telefone: ela não volta em buscas futuras.

## Como a nota é calculada (0–100)
Base 35; +30 se está contratando para uma função que a oferta resolve (vagas do robô de vagas); +10 se tem outras vagas; +12 celular (provável WhatsApp); +6 e-mail no site; +4 site próprio; +6/+10 por volume de avaliações no Google; −15 sem telefone nem e-mail.

## Arquivos
- `leads.mjs`: nichos, modelos de oferta, busca no Google Maps (SerpApi), leitura do site, sinais, nota, mensagens.
- `mailer.mjs`: envio SMTP pelo Gmail (sem dependências).
- `leads-ui.js`: tela Clientes e painel de e-mail.
- Dados em `.radar-jobs-state.json`: `campaigns`, `leads`, `leadBlocks`, `emailLog`. A senha de app fica só no servidor local.

## Ainda não feito
- Detectar respostas automaticamente (IMAP): por enquanto marque "Respondeu" à mão.
- Porte da empresa pelos dados públicos de CNPJ.
- IA própria escrevendo a ficha da oferta (hoje: modelos prontos; troca em `buildOfferSheet`).
