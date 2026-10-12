import assert from 'node:assert/strict';
import {composeMessages,buildOfferSheet} from './leads.mjs';
const c={city:'Feira de Santana, BA',tone:'formal',offer:buildOfferSheet('Automações administrativas')};
for(const niche of ['contabilidade','imobiliaria','distribuidora']){const m=composeMessages({name:'Empresa Teste',niche},c,{name:'Daniel',site:'https://portfolio.test'});assert(m.emailBody.includes('Empresa Teste'));assert(m.emailBody.includes('https://portfolio.test'));assert(!m.emailBody.includes('responder "não"'));assert(m.emailBody.includes('design'));if(niche==='imobiliaria')assert(m.emailBody.includes('imóveis'));if(niche==='contabilidade')assert(m.emailBody.includes('documentos dos clientes'));}
console.log('Mensagens de três segmentos verificadas.');
