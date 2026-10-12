import assert from 'node:assert/strict';
import {composeMessages,prospectEmailHtml} from './leads.mjs';
const m=composeMessages({name:'Empresa',niche:'imobiliaria'},{city:'Feira de Santana',tone:'formal'},{name:'Daniel',phone:'5599999999999',site:'https://portfolio.test/'});
assert(!m.emailBody.includes('WhatsApp'));
assert(!m.emailBody.includes('5599999999999'));
assert(prospectEmailHtml(m.emailBody).includes('href="https://portfolio.test/"'));
assert(prospectEmailHtml('<script>').includes('&lt;script&gt;'));
console.log('Assinatura sem telefone e portfólio clicável: OK.');
