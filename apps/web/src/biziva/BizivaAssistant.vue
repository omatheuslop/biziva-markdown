<script setup lang="ts">
import {computed,ref} from 'vue'
import {useEditorStore} from '@/stores/editor'
import {bizivaMessages} from './messages'
import {documentInstruction,documentIssues,documentMarkdown,parseDocument} from './document'
const editor=useEditorStore()
const language=ref(`pt-BR`)
const copy=computed(()=>bizivaMessages[language.value]??bizivaMessages[`en-US`])
const open=ref(false),key=ref(``),brief=ref(``),draft=ref(``),status=ref(``)
const consent=ref(false),busy=ref(false)
const issues=ref<string[]>([])
const attempts=new Map<string,string>()
async function generate(){
  if(busy.value||!key.value||!brief.value.trim()||!consent.value)return
  busy.value=true;status.value=copy.value.busy
  try{
    const prompt=documentInstruction+brief.value
    const digest=await crypto.subtle.digest(`SHA-256`,new TextEncoder().encode(key.value+`\n`+prompt))
    const hash=Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,`0`)).join(``)
    let id=attempts.get(hash)
    if(!id){id=crypto.randomUUID();attempts.set(hash,id)}
    const response=await fetch(`/api/assist`,{method:`POST`,headers:{'Content-Type':`application/json`,Authorization:`Bearer ${key.value}`,'X-Request-Id':id},body:JSON.stringify({prompt})})
    const result=await response.json()
    if(!response.ok)throw new Error(`api_error`)
    parseDocument(result.text)
    draft.value=result.text;status.value=copy.value.ready
  }catch{status.value=copy.value.invalid}
  finally{busy.value=false}
}
function review(){
  const found=documentIssues(editor.getContent());const messages=[]
  if(found.missingTitle)messages.push(copy.value.title)
  if(found.longParagraphs)messages.push(copy.value.long+found.longParagraphs)
  if(found.placeholders)messages.push(copy.value.placeholders+found.placeholders)
  if(found.prices.length)messages.push(copy.value.prices+found.prices.join(`, `))
  issues.value=messages
  if(!messages.length)status.value=copy.value.clear
}
function apply(){
  if(busy.value)return
  if(!editor.editor){status.value=copy.value.noEditor;return}
  try{
    const document=parseDocument(draft.value)
    const previous=editor.getContent()
    const insert=(previous.trim()?`\n\n---\n\n`:``)+documentMarkdown(document)
    editor.editor.dispatch({changes:{from:editor.editor.state.doc.length,insert},scrollIntoView:true})
    editor.flushContentToPostStore()
    draft.value=``;review();status.value=copy.value.added
  }catch{status.value=copy.value.invalid}
}
</script>
<template>
  <aside class="biziva-doc-assist" @keydown.stop>
    <section v-if="open" aria-label="Biziva Documentos">
      <header><h2>Biziva Documentos</h2><button :aria-label="copy.close" @click="open=false">×</button></header>
      <select v-model="language" aria-label="Language / Idioma"><option value="pt-BR">Português</option><option value="en-US">English</option><option value="zh-CN">简体中文</option><option value="zh-TW">繁體中文</option><option value="ja-JP">日本語</option></select>
      <p>{{copy.description}}</p>
      <label>{{copy.brief}}<textarea v-model="brief" maxlength="5000" /></label>
      <label>{{copy.key}}<input v-model="key" type="password" autocomplete="off" spellcheck="false"></label>
      <small>{{copy.privacy}}</small>
      <label class="consent"><input v-model="consent" type="checkbox">{{copy.consent}}</label>
      <button :disabled="busy||!key||!brief.trim()||!consent" @click="generate">{{copy.generate}}</button>
      <details :open="Boolean(draft)"><summary>{{copy.draft}}</summary><textarea v-model="draft" :aria-label="copy.draft" maxlength="60000" /></details>
      <div class="actions"><button :disabled="busy||!draft.trim()" @click="apply">{{copy.apply}}</button><button @click="review">{{copy.review}}</button></div>
      <p role="status">{{status}}</p><ul><li v-for="issue in issues" :key="issue">{{issue}}</li></ul>
      <footer><a href="/conta" target="_top">{{copy.account}}</a> · <a href="https://github.com/omatheuslop/biziva-markdown" target="_blank" rel="noreferrer">{{copy.source}}</a></footer>
    </section>
    <button :aria-expanded="open" @click="open=!open">✦ Biziva Documentos</button>
  </aside>
</template>
<style scoped>
.biziva-doc-assist{position:fixed;right:16px;bottom:24px;z-index:10000;font:14px/1.5 system-ui;color:#edf2fc}.biziva-doc-assist button{background:#c9f65b;color:#17210b;border:0;border-radius:10px;padding:10px 14px;cursor:pointer;font-weight:650}.biziva-doc-assist button:disabled{opacity:.45;cursor:not-allowed}.biziva-doc-assist section{width:min(390px,calc(100vw - 32px));max-height:calc(100dvh - 110px);overflow:auto;background:#111b2e;border:1px solid #4a5b79;border-radius:18px;padding:20px;margin-bottom:8px;box-shadow:0 15px 60px #0007}.biziva-doc-assist header{display:flex;justify-content:space-between;align-items:center}.biziva-doc-assist h2{font-size:20px}.biziva-doc-assist label{display:block;margin:12px 0}.biziva-doc-assist textarea,.biziva-doc-assist input[type=password],.biziva-doc-assist select{display:block;width:100%;background:#0b1220;color:white;border:1px solid #526584;border-radius:8px;padding:10px;box-sizing:border-box}.biziva-doc-assist textarea{min-height:90px;resize:vertical}.biziva-doc-assist .consent{display:flex;gap:8px}.consent input{margin-top:5px}.biziva-doc-assist small,.biziva-doc-assist footer{font-size:12px;color:#bcc9e0}.biziva-doc-assist a{color:#c9f65b}.biziva-doc-assist footer{border-top:1px solid #4a5b79;padding-top:12px;margin-top:12px}.biziva-doc-assist ul{padding-left:20px}.biziva-doc-assist summary{cursor:pointer;margin:12px 0}.actions{display:flex;gap:8px;flex-wrap:wrap}.biziva-doc-assist :focus-visible{outline:3px solid #c9f65b;outline-offset:2px}
</style>
