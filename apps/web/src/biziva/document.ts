export interface DocumentDraft {title:string,sections:{heading:string,paragraphs:string[]}[]}
function text(value:unknown,max:number):string {
  if(typeof value!==`string`||!value.trim()||value.length>max)throw new Error(`invalid_draft`)
  return value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,``)
}
export function parseDocument(source:string):DocumentDraft {
  if(source.length>60000)throw new Error(`invalid_draft`)
  const data=JSON.parse(source.trim().replace(/^```(?:json)?\s*/i,``).replace(/\s*```$/,``))
  if(!Array.isArray(data.sections)||!data.sections.length||data.sections.length>8)throw new Error(`invalid_draft`)
  return {title:text(data.title,120),sections:data.sections.map((section:{heading:unknown,paragraphs:unknown})=>{
    if(!Array.isArray(section.paragraphs)||!section.paragraphs.length||section.paragraphs.length>5)throw new Error(`invalid_draft`)
    return {heading:text(section.heading,120),paragraphs:section.paragraphs.map(value=>text(value,1000))}
  })}
}
const literal=(value:string)=>value.replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`).replace(/([\\`*_{}\[\]()#+.!|~-])/g,`\\$1`).replace(/[\r\n]+/g,` `)
export function documentMarkdown(document:DocumentDraft):string {
  return `# ${literal(document.title)}\n\n`+document.sections.map(section=>`## ${literal(section.heading)}\n\n`+section.paragraphs.map(literal).join(`\n\n`)).join(`\n\n`)
}
export function documentIssues(source:string) {
  return {
    missingTitle:!/^#\s+\S/m.test(source),
    longParagraphs:source.split(/\n\s*\n/).filter(paragraph=>paragraph.length>800).length,
    placeholders:(source.match(/\b(?:TODO|INSERIR|PREENCHER|XXXX)\b|\[\s*(?:nome|valor|data|empresa|name|price|date|company)\s*\]/gi)||[]).length,
    prices:[...new Set(source.match(/(?:R\$|US\$|€|\$)\s*[\d.,]+/g)||[])].slice(0,10),
  }
}
export const documentInstruction=`Retorne apenas JSON {"title":"Título","sections":[{"heading":"Seção","paragraphs":["Texto completo"]}]}. Entre 1 e 8 seções, até 5 parágrafos por seção. Títulos até 120 caracteres, parágrafos até 1000. Escreva documento comercial em português baseado no pedido. Não invente preços, datas, garantias, depoimentos ou compromissos. Não use HTML ou Markdown dentro dos textos. Descrição:\n`
