/* Offline-only import of learner-authored Q&A lists. No network, AI or grading. */
(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.ActiveRecallQAImport=api;
})(globalThis,function(){
  'use strict';
  const MAX_BYTES=400000,MAX_ROWS=200;
  const TYPES=new Map([['recall','recall'],['fact','recall'],['facts','recall'],['explain','explain'],['explanation','explain'],['apply','apply'],['application','apply']]);
  const strip=s=>String(s??'').trim();
  function normalHeader(value){return strip(value).toLowerCase().replace(/[_-]+/g,' ').replace(/\s+/g,' ');}
  function check(rows){
    if(!Array.isArray(rows)||!rows.length)throw Error('No question-and-answer pairs found.');
    if(rows.length>MAX_ROWS)throw Error('Import at most 200 questions at a time. Split larger lists into separate files.');
    return rows.map((row,index)=>{
      const question=strip(row.question),answer=strip(row.answer),lectureTitle=strip(row.lectureTitle),courseName=strip(row.courseName);
      if(!question||!answer)throw Error('Row '+(index+1)+': both a question and an answer are required.');
      if(question.length>500||answer.length>4000||lectureTitle.length>120||courseName.length>80)
        throw Error('Row '+(index+1)+': question, answer, lecture or course exceeds the supported length.');
      const raw=strip(row.kind).toLowerCase();
      if(raw&&!TYPES.has(raw))throw Error('Row '+(index+1)+': unknown practice type. Use Recall, Explain or Apply.');
      return {question,answer,lectureTitle,courseName,kind:raw?TYPES.get(raw):''};
    });
  }
  function parseLabeled(text){
    const result=[];let pending=null,hasAnswer=false;
    const finish=()=>{
      if(!pending)return;
      if(!hasAnswer||!pending.question.trim()||!pending.answer.trim())throw Error('Every Q: line needs one nonempty A: line; nothing was imported.');
      result.push(pending);pending=null;hasAnswer=false;
    };
    for(const line of text.replace(/\r\n?/g,'\n').split('\n')){
      const q=line.match(/^\s*(?:[-*]\s*|\d+[.)]\s*)?(?:Q|Question)\s*(?:\d+)?\s*:\s*(.*)$/i);
      const a=line.match(/^\s*(?:[-*]\s*)?(?:A|Answer)\s*(?:\d+)?\s*:\s*(.*)$/i);
      if(q){finish();pending={question:q[1],answer:''};continue;}
      if(a){if(!pending||hasAnswer)throw Error('Every question needs exactly one A: line; nothing was imported.');pending.answer=a[1];hasAnswer=true;continue;}
      if(!line.trim()||/^\s*---\s*$/.test(line)){if(pending&&hasAnswer)pending.answer+='\n';continue;}
      if(!pending||!hasAnswer)throw Error('Use Q: question followed by A: answer. Nothing was imported.');
      pending.answer+='\n'+line;
    }
    finish();
    return result;
  }
  function splitDelimited(text,delimiter){
    const rows=[];let row=[],cell='',quoted=false,closed=false;
    const pushCell=()=>{row.push(cell);cell='';closed=false;if(row.length>25)throw Error('A table row has too many columns.');};
    const pushRow=()=>{pushCell();if(row.some(x=>x.trim()))rows.push(row);row=[];if(rows.length>MAX_ROWS+2)throw Error('Import at most 200 questions at a time.');};
    for(let i=0;i<text.length;i++){
      const c=text[i];
      if(c==='"'){
        if(quoted&&text[i+1]==='"'){cell+='"';i++;continue;}
        if(quoted){quoted=false;closed=true;continue;}
        if(!cell.trim()&&!closed){cell='';quoted=true;continue;}
        throw Error('Invalid quoted CSV/TSV cell. Double interior quote marks.');
      }
      if(!quoted&&(c===delimiter||c==='\n'||c==='\r')){
        if(c===delimiter)pushCell();
        else{if(c==='\r'&&text[i+1]==='\n')i++;pushRow();}
        continue;
      }
      if(closed&&!/^\s$/.test(c))throw Error('Unexpected text after a closing CSV/TSV quote.');
      if(!closed)cell+=c;
    }
    if(quoted)throw Error('Unclosed quoted CSV/TSV answer.');
    if(cell||row.length)pushRow();
    return rows;
  }
  function parseTable(text,delimiter){
    const table=splitDelimited(text,delimiter);
    if(!table.length)throw Error('The table is empty.');
    const headers=table[0].map(normalHeader);
    const column=names=>headers.findIndex(h=>names.includes(h));
    let q=column(['question','prompt','q']),a=column(['answer','reference answer','model answer','a']);
    const looksHeader=q>=0||a>=0;
    if(looksHeader&&(q<0||a<0))throw Error('The header must include both Question and Answer columns.');
    let title=column(['lecture','lecture title','topic','section']),kind=column(['type','kind','practice type']),course=column(['course','course name']);
    let data=table;
    if(looksHeader)data=table.slice(1);
    else{q=0;a=1;title=-1;kind=-1;course=-1;}
    return data.map((r,i)=>{
      if(r.length<=Math.max(q,a))throw Error('Table row '+(i+1)+' is missing a question or answer column.');
      return {question:r[q],answer:r[a],lectureTitle:title>=0?r[title]||'':'',kind:kind>=0?r[kind]||'':'',courseName:course>=0?r[course]||'':''};
    });
  }
  function parseJSON(text){
    let obj;
    try{obj=JSON.parse(text);}catch{throw Error('The JSON file is not valid.');}
    const list=Array.isArray(obj)?obj:obj?.questions;
    if(!Array.isArray(list))throw Error('JSON must be an array of question/answer objects or an object with a questions array.');
    return list.map((item,index)=>{
      if(!item||typeof item!=='object'||Array.isArray(item))throw Error('JSON item '+(index+1)+' must be an object.');
      const pick=names=>{const key=Object.keys(item).find(k=>names.includes(normalHeader(k)));return key===undefined?'':item[key];};
      return {question:pick(['question','prompt','q']),answer:pick(['answer','reference answer','a']),
        lectureTitle:pick(['lecture','lecture title','topic','section']),kind:pick(['kind','type','practice type']),courseName:pick(['course','course name'])};
    });
  }
  function parse(input,{format='auto'}={}){
    const text=String(input??'').replace(/^\uFEFF/,'');
    if(!text.trim()||text.length>MAX_BYTES)throw Error('Choose a nonempty text list smaller than 400 KB.');
    let mode=format.toLowerCase();
    if(mode==='txt'||mode==='md'||mode==='markdown')mode='qa';
    if(mode==='auto'){
      const first=text.trimStart();
      if(first.startsWith('{')||first.startsWith('['))mode='json';
      else if(/^\s*(?:[-*]\s*|\d+[.)]\s*)?(?:Q|Question)\s*(?:\d+)?\s*:/im.test(text))mode='qa';
      else if(text.includes('\t'))mode='tsv';
      else{
        const firstLine=text.split(/\r?\n/,1)[0].split(',').map(normalHeader);
        if(firstLine.some(h=>['question','prompt','q'].includes(h))&&firstLine.some(h=>['answer','reference answer','a'].includes(h)))mode='csv';
        else throw Error('Paste Q:/A: pairs, a Question/Answer CSV table or tab-separated spreadsheet rows. Plain notes are not automatically treated as questions.');
      }
    }
    if(!['qa','csv','tsv','json'].includes(mode))throw Error('Supported formats: Q:/A: text, CSV, TSV or JSON.');
    const rows=mode==='qa'?parseLabeled(text):mode==='json'?parseJSON(text):parseTable(text,mode==='csv'?',':'\t');
    return {format:mode,rows:check(rows)};
  }
  return {parse,MAX_ROWS,MAX_BYTES};
});
