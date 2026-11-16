/* Active Recall Web v2.3 — intentionally LIMITED local PDF text-layer reader.
   No external network or paid dependencies. NOT a general PDF renderer/parser.
   If a document uses an unsupported PDF feature, fail closed so that incomplete
   content cannot silently become verified learning material. */
(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;root.ActiveRecallPdfLite=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const MAX_PDF_BYTES=12*1024*1024,MAX_STREAM_BYTES=6*1024*1024,MAX_PAGES=80;
const latin=b=>new TextDecoder('latin1').decode(b);
function err(message){throw Error('Offline PDF reader: '+message+' Use the optional full PDF.js reader when online, or import a TXT/Markdown export.');}
function hexBytes(hex){const s=hex.replace(/\s/g,'');if(!/^[0-9A-Fa-f]*$/.test(s))err('Invalid hexadecimal content.');const h=s.length%2?s+'0':s;return Uint8Array.from(h.match(/../g)||[],v=>parseInt(v,16));}
function ascii85(input){
 let s=input.replace(/\s/g,'').replace(/^<~/,'').replace(/~>.*$/,'');const out=[];let group=[];
 function put(g,n){let val=0;for(let j=0;j<5;j++)val=val*85+(j<g.length?g[j]:84);if(val>4294967295)err('Malformed ASCII85 stream.');for(let j=0;j<n;j++)out.push(Math.floor(val/Math.pow(256,3-j))%256);}
 for(const c of s){if(c==='z'){if(group.length)err('Malformed ASCII85 stream.');out.push(0,0,0,0);continue;}const v=c.charCodeAt(0)-33;if(v<0||v>84)err('Unsupported ASCII85 characters.');group.push(v);if(group.length===5){put(group,4);group=[];}}
 if(group.length){if(group.length===1)err('Malformed ASCII85 tail.');put(group,group.length-1);}return Uint8Array.from(out);
}
async function inflate(bytes){
 if(typeof DecompressionStream==='undefined')err('Deflate decompression is unavailable in this browser.');
 try{
  const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'));
  const reader=stream.getReader(),parts=[];let total=0;
  while(true){const {done,value}=await reader.read();if(done)break;total+=value.length;
   if(total>MAX_STREAM_BYTES){await reader.cancel().catch(()=>{});err('Decoded PDF stream is too large.');}parts.push(value);}
  const out=new Uint8Array(total);let offset=0;
  for(const p of parts){out.set(p,offset);offset+=p.length;}
  return out;
 }catch(e){err('Cannot decompress this PDF text stream ('+(e.message||'unsupported encoding')+').');}
}
async function decodeStream(dict,bytes){
 let filters=[];
 const array=dict.match(/\/Filter\s*\[([\s\S]*?)\]/),one=dict.match(/\/Filter\s*\/(\w+)/);
 if(array)filters=[...array[1].matchAll(/\/(\w+)/g)].map(x=>x[1]);else if(one)filters=[one[1]];
 let b=bytes;
 for(const f of filters){
   if(f==='FlateDecode'||f==='Fl')b=await inflate(b);
   else if(f==='ASCII85Decode'||f==='A85')b=ascii85(latin(b));
   else if(f==='ASCIIHexDecode'||f==='AHx')b=hexBytes(latin(b).replace(/>.*/,''));
   else err('Unsupported PDF stream filter '+f+'.');
 }
 if(b.length>MAX_STREAM_BYTES)err('Decoded PDF stream is too large.');
 return latin(b);
}
function pdfString(s){
 if(s[0]==='<'){
  const bytes=hexBytes(s.slice(1,-1));
  if(bytes[0]===254&&bytes[1]===255){let out='';for(let i=2;i+1<bytes.length;i+=2)out+=String.fromCharCode((bytes[i]<<8)|bytes[i+1]);return out;}
  if(bytes[0]===255&&bytes[1]===254){let out='';for(let i=2;i+1<bytes.length;i+=2)out+=String.fromCharCode((bytes[i+1]<<8)|bytes[i]);return out;}
  return latin(bytes);
 }
 let v=s.slice(1,-1);let out='';for(let i=0;i<v.length;i++){
  if(v[i]!=='\\'){out+=v[i];continue;}const ch=v[++i];if(ch===undefined)break;
  const map={n:'\n',r:'\r',t:'\t',b:'\b',f:'\f'};
  if(ch in map)out+=map[ch];else if(ch==='\n'){}else if(ch==='\r'){if(v[i+1]==='\n')i++;}
  else if(/[0-7]/.test(ch)){let oct=ch;for(let j=0;j<2&&/[0-7]/.test(v[i+1]||'x');j++)oct+=v[++i];out+=String.fromCharCode(parseInt(oct,8));}
  else out+=ch;
 }return out;
}
const STR='(?:\\\\[\\s\\S]|[^\\\\)])*';
const TOKEN=new RegExp('(\\('+STR+'\\)|<[A-Fa-f0-9\\s]+>)\\s*(?:Tj|[\\x27\\x22])|\\[([\\s\\S]*?)\\]\\s*TJ','g');
function textFromStream(stream){
 const parts=[];
 for(const block of stream.matchAll(/BT\b([\s\S]*?)\bET\b/g)){
   let text='';TOKEN.lastIndex=0;
   for(const token of block[1].matchAll(TOKEN)){
    if(token[1])text+=pdfString(token[1])+'\n';
    else if(token[2]){
      const tokens=[...token[2].matchAll(new RegExp('\\('+STR+'\\)|<[A-Fa-f0-9\\s]+>|-?\\d+(?:\\.\\d+)?','g'))];
      for(const t of tokens){if(t[0][0]==='('||t[0][0]==='<')text+=pdfString(t[0]);else if(Number(t[0]) < -140)text+=' ';}text+='\n';
    }
   }
   if(text.trim())parts.push(text.trim());
 }
 return parts.join('\n');
}
function parseObjects(raw){
 const objects=new Map();
 for(const match of raw.matchAll(/(?:^|[\r\n])\s*(\d+)\s+\d+\s+obj\b([\s\S]*?)\bendobj\b/g)){
  const content=match[2],stream=content.match(/\bstream\r?\n/);let dict=content,bytes=null;
  if(stream){const start=stream.index+stream[0].length;let end=content.indexOf('endstream',start);if(end<0)err('Malformed PDF stream.');while(end>start&&(content[end-1]==='\n'||content[end-1]==='\r'))end--;bytes=Uint8Array.from(content.slice(start,end),c=>c.charCodeAt(0)&255);dict=content.slice(0,stream.index);}
  objects.set(Number(match[1]),{dict,bytes});
 }
 return objects;
}
function referencedContents(dict){const a=dict.match(/\/Contents\s*\[([\s\S]*?)\]/),b=dict.match(/\/Contents\s+(\d+)\s+\d+\s+R/);return a?[...a[1].matchAll(/(\d+)\s+\d+\s+R/g)].map(m=>Number(m[1])):b?[Number(b[1])]:[];}
function orderedPages(objects){
 const catalogs=[...objects.entries()].filter(([,o])=>/\/Type\s*\/Catalog\b/.test(o.dict));
 if(catalogs.length!==1)err('Cannot safely determine PDF page order (missing or multiple catalogues).');
 const root=catalogs[0][1].dict.match(/\/Pages\s+(\d+)\s+\d+\s+R/);
 if(!root)err('Cannot identify the PDF page-tree root.');
 const visited=new Set(),result=[];
 function walk(id,depth){
  if(depth>32||visited.has(id))err('Invalid or cyclic PDF page tree.');
  visited.add(id);const o=objects.get(id);
  if(!o)err('Missing PDF page-tree object.');
  if(/\/Type\s*\/Page\b/.test(o.dict)){result.push(o);return;}
  if(!/\/Type\s*\/Pages\b/.test(o.dict))err('Unsupported page-tree object.');
  const children=o.dict.match(/\/Kids\s*\[([\s\S]*?)\]/);
  if(!children)err('Cannot identify page order from /Kids.');
  const ids=[...children[1].matchAll(/(\d+)\s+\d+\s+R/g)].map(m=>Number(m[1]));
  if(!ids.length)err('Empty PDF page tree.');
  for(const child of ids)walk(child,depth+1);
 }
 walk(Number(root[1]),0);
 const actual=[...objects.values()].filter(o=>/\/Type\s*\/Page\b/.test(o.dict)).length;
 if(result.length!==actual)err('PDF page tree does not account for every page.');
 if(result.length>MAX_PAGES)err('PDF exceeds the 80-page limit.');
 return result;
}

async function extract(arrayBuffer){
 const bytes=new Uint8Array(arrayBuffer);
 if(bytes.length>MAX_PDF_BYTES)err('File exceeds the 12 MB limit.');
 if(latin(bytes.subarray(0,8)).indexOf('%PDF-')!==0)err('Not a valid PDF header.');
 const raw=Array.from(bytes,b=>String.fromCharCode(b)).join('');
 if(/\/Encrypt\b/.test(raw))err('Encrypted or password-protected PDFs are not supported.');
 if(/\/Type\s*\/ObjStm\b/.test(raw))err('This PDF uses compressed object streams that the limited reader does not support.');
 const objects=parseObjects(raw);
 if(!objects.size)err('Could not identify PDF objects.');
 const pages=orderedPages(objects);
 if(!pages.length)err('Could not locate standard PDF pages.');
 const decoded=new Map(),output=[],auditPages=[];
 const fontRisk=[...objects.values()].some(o=>/\/Subtype\s*\/Type0\b|\/Encoding\s*\/Identity-[HV]\b|\/ToUnicode\b/.test(o.dict));
 const imageRisk=[...objects.values()].some(o=>/\/Subtype\s*\/Image\b/.test(o.dict));
 for(let i=0;i<pages.length;i++){
  const refs=referencedContents(pages[i].dict);
  if(!refs.length)err('This page does not use a supported /Contents reference.');
  let text='';for(const ref of refs){const ob=objects.get(ref);if(!ob||!ob.bytes)err('Missing or unsupported PDF content stream.');if(!decoded.has(ref))decoded.set(ref,await decodeStream(ob.dict,ob.bytes));text+='\n'+textFromStream(decoded.get(ref));}
  const cleaned=text.trim();
  if(!cleaned)err('No extractable text layer found on page '+(i+1)+'. Import cancelled to avoid missing study material.');
  const flags=[];
  if(cleaned.length<25)flags.push('Very little text detected; compare this page with the original.');
  if(fontRisk)flags.push('Special font mapping detected; some symbols or characters may be incorrect.');
  if(imageRisk)flags.push('The PDF contains images; information in figures is not extracted.');
  if(/[\u0000-\u0008\u000b\u000e-\u001f\ufffd]/.test(cleaned))flags.push('Unusual or replacement characters were found.');
  auditPages.push({page:i+1,characters:cleaned.length,flags});
  output.push(`[Page ${i+1}]\n${cleaned}`);
 }
 return {text:output.join('\n\n'),pageCount:pages.length,extractionAudit:{mode:'limited-offline',pages:auditPages,requiresConfirmation:true},warning:'Limited offline PDF reader. Page order is derived from the PDF page tree; fonts, tables, columns, figures, mathematical symbols and reading order may still be incomplete or incorrect. Compare every page against the original before importing.'};
}
return {extract,pdfString,ascii85,textFromStream};
});
