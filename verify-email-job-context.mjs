import assert from 'node:assert/strict';
import {composeMessages,buildOfferSheet} from './leads.mjs';
const c={city:'Feira de Santana, BA',offer:buildOfferSheet('automação de planilhas')};
const sender={name:'Daniel',site:'https://portfolio.test'};
const unrelated=composeMessages({name:'Empresa',niche:'contabilidade',signals:[{type:'hiring',text:'Está contratando: Serviços gerais'}]},c,sender);
assert(!unrelated.emailBody.includes('parte desse trabalho'));
const relevant=composeMessages({name:'Empresa',niche:'contabilidade',signals:[{type:'hiring-relevant',text:'Está contratando: Digitador'}]},c,sender);
assert(relevant.emailBody.includes('Digitador'));
console.log('Mensagens para vagas relacionadas e não relacionadas: OK.');
