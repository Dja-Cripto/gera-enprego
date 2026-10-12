import {inflateRawSync} from 'node:zlib';
import {createHash} from 'node:crypto';
export const importHash=value=>createHash('sha256').update(value).digest('hex');
export function safeImportPath(value){const p=String(value).replace(/\\/g,'/');if(!p||p.startsWith('/')||p.split('/').some(x=>x==='..')||p.includes('\0')||/^[a-z]:/i.test(p))throw Error('Nome de arquivo inválido no pacote.');return p}
export function unzipPosts(bytes){
  let end=-1;for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--)if(bytes.readUInt32LE(i)===0x06054b50){end=i;break}
  if(end<0)throw Error('Use um ZIP válido, sem senha, ou selecione a pasta.');
  const count=bytes.readUInt16LE(end+10);let offset=bytes.readUInt32LE(end+16),total=0;const files=[];
  if(count>250)throw Error('O pacote aceita até 250 arquivos.');
  for(let i=0;i<count;i++){
    if(offset+46>bytes.length||bytes.readUInt32LE(offset)!==0x02014b50)throw Error('ZIP incompleto.');
    const flags=bytes.readUInt16LE(offset+8),method=bytes.readUInt16LE(offset+10),size=bytes.readUInt32LE(offset+24),packed=bytes.readUInt32LE(offset+20),n=bytes.readUInt16LE(offset+28),extra=bytes.readUInt16LE(offset+30),comment=bytes.readUInt16LE(offset+32),local=bytes.readUInt32LE(offset+42);
    const path=safeImportPath(bytes.subarray(offset+46,offset+46+n).toString('utf8'));offset+=46+n+extra+comment;
    if(path.endsWith('/'))continue;if(flags&1)throw Error('ZIP com senha não é suportado.');
    if(!/\.(txt|md|jpg|jpeg|png|mp4)$/i.test(path))continue;
    total+=size;if(size>50*1024*1024||total>80*1024*1024)throw Error('O pacote excede 80 MB ou contém arquivo maior que 50 MB.');
    if(local+30>bytes.length||bytes.readUInt32LE(local)!==0x04034b50)throw Error('Entrada ZIP inválida.');
    const start=local+30+bytes.readUInt16LE(local+26)+bytes.readUInt16LE(local+28);if(start+packed>bytes.length)throw Error('ZIP incompleto.');
    const input=bytes.subarray(start,start+packed);const data=method===0?Buffer.from(input):method===8?inflateRawSync(input,{maxOutputLength:Math.max(1,size)}):null;
    if(!data||data.length!==size)throw Error('Método de compactação não suportado ou arquivo corrompido.');files.push({path,data});
  }return files;
}
export function describeImport(files){
  if(files.length>250)throw Error('Selecione até 250 arquivos.');
  const paths=new Set();for(const f of files){f.path=safeImportPath(f.path);if(paths.has(f.path))throw Error('Há arquivos com nomes repetidos.');paths.add(f.path)}
  const readme=files.find(f=>/\/(leia-me|readme)\.md$/i.test('/'+f.path));const guide=readme?.text||readme?.data?.toString('utf8')||'';
  const posts=files.filter(f=>/\.txt$/i.test(f.path)&&/(^|\/)posts\//i.test(f.path));
  if(!posts.length)throw Error('Não encontrei textos na pasta posts. Coloque os arquivos .txt dentro de posts/.');
  const rows=guide.split('\n').filter(line=>line.startsWith('|')&&/posts\//i.test(line));
  const order=rows.flatMap(row=>[...row.matchAll(/\]\(([^)]+\.txt)\)/gi)].map(m=>m[1]));
  const relative=p=>p.replace(/^.*?(posts\/|midias\/)/i,'$1');
  const result=posts.map(f=>{
    const text=String(f.text??f.data?.toString('utf8')??'').replace(/^\uFEFF/,'').trim();if(!text||text.length>3000)throw Error(`O texto ${f.path} deve ter entre 1 e 3.000 caracteres.`);
    const row=rows.find(r=>r.includes(relative(f.path)));let media=[];
    if(row)media=[...row.matchAll(/\]\(([^)]+\.(?:jpg|jpeg|png|mp4))\)/gi)].map(m=>files.find(x=>relative(x.path)===m[1])).filter(Boolean);
    else{const id=f.path.split('/').at(-1).match(/^\d+/)?.[0];if(id)media=files.filter(x=>/\.(jpg|jpeg|png|mp4)$/i.test(x.path)&&x.path.split('/').at(-1).startsWith(id+'-'))}
    const warnings=[];if(!media.length)warnings.push('Sem mídia associada: selecione um arquivo antes de agendar.');
    return {source:f.path,text,hook:text.split('\n')[0],media:media.map(x=>x.path),warnings,order:order.indexOf(relative(f.path)),hash:importHash(text+media.map(x=>x.path).join('|'))};
  });return result.sort((a,b)=>(a.order<0?999:a.order)-(b.order<0?999:b.order)||a.source.localeCompare(b.source,undefined,{numeric:true}));
}
