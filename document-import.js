/* Active Recall Web 2.3 — local document extraction. MIT-licensed PDF.js is
   fetched only when the learner explicitly chooses a PDF; no PDF bytes are
   transmitted. TXT/MD capture and every other app function work offline. */
(function(root,factory){const api=factory(root);if(typeof module!=='undefined'&&module.exports)module.exports=api;root.ActiveRecallDocumentImport=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){
  'use strict';
  const MAX_CHARS=72000,CHUNK_CHARS=12000,MAX_FILE_BYTES=12*1024*1024,MAX_PAGES=80;
  const PDF_JS_URL='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs';
  const PDF_WORKER_URL='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';
  function formatOf(name,mime=''){
    const n=String(name||'').toLowerCase();
    if(n.endsWith('.txt'))return 'txt';
    if(n.endsWith('.md')||n.endsWith('.markdown'))return 'md';
    if(n.endsWith('.pdf')||mime==='application/pdf')return 'pdf';
    return null;
  }
  function validateText(content){
    if(typeof content!=='string')throw Error('The extracted content must be text.');
    const text=content.replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n');
    if(text.includes('\u0000'))throw Error('This appears to be a binary file, not text.');
    if(!text.trim())throw Error('No extractable text was found. Scanned PDFs need OCR, which this version does not provide.');
    if(text.length>MAX_CHARS)throw Error(`This document has ${text.length.toLocaleString()} characters. The safe limit is ${MAX_CHARS.toLocaleString()}; please split it into smaller files. Nothing was saved.`);
    return text;
  }
  function chunkText(content,maxChars=CHUNK_CHARS){
    const text=validateText(content);
    if(!Number.isSafeInteger(maxChars)||maxChars<100||maxChars>20000)throw Error('Invalid chunk size.');
    const chunks=[];let start=0;
    while(start<text.length){
      let end=Math.min(start+maxChars,text.length);
      if(end<text.length){
        const segment=text.slice(start,end), minSplit=Math.floor(maxChars*0.60);
        const paragraph=segment.lastIndexOf('\n\n');
        const line=segment.lastIndexOf('\n');
        const space=segment.lastIndexOf(' ');
        const pivot=paragraph>=minSplit?paragraph+2:line>=minSplit?line+1:space>=minSplit?space+1:-1;
        if(pivot>0)end=start+pivot;
        // Do not split in the middle of a Unicode surrogate pair.
        else if(end<text.length && /[\uD800-\uDBFF]/.test(text[end-1]))end--;
      }
      const piece=text.slice(start,end);
      if(!piece.trim())throw Error('The document contains an unusually long whitespace-only section. Please remove it before import. No data was saved.');
      chunks.push({text:piece,start,end});
      start=end;
    }
    if(!chunks.length)throw Error('Nothing extractable was found.');
    if(chunks.length>8)throw Error('The document requires too many parts; please split it into smaller files.');
    // Source offsets remain relative to each part's exact, unchanged extracted text.
    return chunks;
  }
  let pdfLoadPromise=null;
  function loadPdfJs(){
    // The module and worker are downloaded by the browser only when a learner
    // explicitly selects a PDF. No account or API key; no PDF bytes uploaded.
    if(root.pdfjsLib)return Promise.resolve(root.pdfjsLib); // test / optional preloaded module
    if(typeof document==='undefined')return Promise.reject(Error('PDF extraction needs a browser.'));
    if(pdfLoadPromise)return pdfLoadPromise;
    pdfLoadPromise=import(PDF_JS_URL).then(mod=>{
      if(typeof mod.getDocument!=='function')throw Error('The free PDF reader did not initialise.');
      return mod;
    }).catch(err=>{
      pdfLoadPromise=null;
      throw Error('PDF import needs an initial internet connection to load the free, patched PDF.js reader. TXT and Markdown work offline. '+(err?.message||''));
    });
    return pdfLoadPromise;
  }
  async function textFromPdf(file){
    const pdfjs=await loadPdfJs();
    pdfjs.GlobalWorkerOptions.workerSrc=PDF_WORKER_URL;
    const bytes=new Uint8Array(await file.arrayBuffer());
    let task,doc;
    try{
      task=pdfjs.getDocument({data:bytes,useSystemFonts:true,isEvalSupported:false,enableScripting:false});
      doc=await task.promise;
      if(doc.numPages>MAX_PAGES)throw Error(`This PDF contains ${doc.numPages} pages. The current limit is ${MAX_PAGES}; please split the document.`);
      const pages=[],auditPages=[],missingPages=[];let extractedCharacters=0;
      for(let i=1;i<=doc.numPages;i++){
        const page=await doc.getPage(i);
        const content=await page.getTextContent();
        let text='';
        for(const item of content.items){
          if(typeof item.str!=='string')continue;
          text+=item.str+(item.hasEOL?'\n':' ');
        }
        const cleaned=text.trim();
        const flags=[];
        if(!cleaned){
          // A blank slide, a scanned figure and an unsupported font can all have
          // an empty text layer. Never pretend to know which case applies.
          missingPages.push(i);
          flags.push('No extractable text: this page was NOT converted into study material. Inspect and transcribe it if needed.');
          pages.push(`[Page ${i}]`); // Keep its position and outline entry, but no fabricated learning content.
        }else{
          if(cleaned.length<25)flags.push('Very little text detected; compare with the original.');
          if(content.items.some(item=>item.str&&/[\uFFFD\u0000-\u0008]/.test(item.str)))flags.push('Unusual characters found; compare symbols with the original.');
          pages.push(`[Page ${i}]\n${cleaned}`);
          extractedCharacters+=cleaned.length;
        }
        auditPages.push({page:i,characters:cleaned.length,flags,missingText:!cleaned});
      }
      if(!extractedCharacters)throw Error('This PDF has no extractable text on any page. Scanned documents need OCR or a text export; nothing was imported.');
      const warning=missingPages.length
        ?`PDF.js extracted readable pages, but ${missingPages.length} page(s) had no text layer: ${missingPages.join(', ')}. Those pages contain NO automatically generated study material. Check the original and add essential text manually, or explicitly accept the gaps before importing.`
        :'Text was extracted locally from the PDF text layer. Equations, images, tables, columns and reading order may need correction. Check each page against the original.';
      return {text:pages.join('\n\n'),pageCount:doc.numPages,extractionAudit:{mode:'pdfjs-online',pages:auditPages,missingPages,requiresConfirmation:true},warning};
    } catch(err){
      if(err?.name==='PasswordException')throw Error('Password-protected PDFs are not supported. Unlock the PDF locally before importing.');
      throw err;
    } finally{if(doc?.destroy)await doc.destroy().catch(()=>{});else if(task?.destroy)await task.destroy().catch(()=>{});}
  }
  function buildOutline(content,format='txt'){
    const text=validateText(content), entries=[];
    let offset=0;
    for(const line of text.split('\n')){
      const trimmed=line.trim();let level=1,label=null,kind='heading';
      if(format==='pdf'){
        const m=trimmed.match(/^\[Page (\d+)\]$/);
        if(m){label='Page '+m[1];kind='page';level=1;}
      }
      if(!label && format==='md'){
        const m=trimmed.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
        if(m){label=m[2];level=m[1].length;}
      }
      if(!label){
        const m=trimmed.match(/^(?:Chapter|Lecture|Unit|Section|Topic|Module)\s+[\dIVX]+(?:\s*[:.\-—]\s*|\s+).{0,100}$/i);
        if(m){label=trimmed;level=2;}
      }
      if(label && entries.length<80)entries.push({title:label.slice(0,120),start:offset+line.indexOf(trimmed),level,kind});
      offset+=line.length+1;
    }
    if(!entries.length)entries.push({title:'Document beginning',start:0,level:1,kind:'start'});
    return entries.map((e,i)=>({...e,end:i+1<entries.length?entries[i+1].start:text.length}));
  }
  async function localPdfText(file){
    if(!root.ActiveRecallPdfLite||typeof root.ActiveRecallPdfLite.extract!=='function')throw Error('Limited offline PDF reader is unavailable.');
    return root.ActiveRecallPdfLite.extract(await file.arrayBuffer());
  }
  async function extractFile(file,{pdfMode='auto',confirmOnlineFallback=null}={}){
    if(!file||typeof file.name!=='string')throw Error('Choose a TXT, Markdown, or PDF file.');
    const format=formatOf(file.name,file.type);
    if(!format)throw Error('Supported files: .txt, .md, .markdown and text-based .pdf.');
    if(file.size>MAX_FILE_BYTES)throw Error('The file is too large (12 MB maximum). It was not read.');
    if(!file.size)throw Error('The selected file is empty.');
    let extracted;
    if(format!=='pdf')extracted={text:await file.text(),pageCount:null,warning:null};
    else if(pdfMode==='full')extracted=await textFromPdf(file);
    else if(pdfMode==='offline')extracted=await localPdfText(file);
    else if(pdfMode==='auto'){
      try{extracted=await localPdfText(file);}
      catch(offlineError){
        // No external library download without a direct, informed user action.
        const consent=typeof confirmOnlineFallback==='function' && await confirmOnlineFallback(offlineError.message);
        if(!consent)throw Error('The offline PDF reader could not decode this PDF. Nothing was saved. Choose Full PDF.js (free; online) or approve the suggested fallback. '+offlineError.message);
        extracted=await textFromPdf(file);
        extracted.warning='The limited offline reader could not decode this PDF; the free full PDF.js reader was used with your permission. '+(extracted.warning||'');
      }
    }else throw Error('Choose a supported PDF reading mode.');
    const content=validateText(extracted.text),chunks=chunkText(content);
    return {name:file.name.replace(/[\\/]/g,'').slice(0,180),format,content,chunks,outline:buildOutline(content,format),pageCount:extracted.pageCount,extractionAudit:extracted.extractionAudit||null,warning:extracted.warning||null,characters:content.length};
  }
  return {MAX_CHARS,CHUNK_CHARS,MAX_FILE_BYTES,MAX_PAGES,formatOf,validateText,chunkText,buildOutline,localPdfText,extractFile};
});
