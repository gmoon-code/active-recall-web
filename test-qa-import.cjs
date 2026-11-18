/* Offline learner Q&A list ingestion, validation and history integrity. */
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const Q=require('./qa-import.js');
const C=require('./core.js');

const fixture=()=>{const db=C.initialDb(),course=C.addCourse(db,'AP Biology');return {db,course};};

test('numbered Q/A text with multiline answer imports without rewriting the answer',()=>{
  const parsed=Q.parse('1. Q: What powers ATP synthase?\nA: The proton gradient.\nIt provides free energy.\n\n2) Question: What does it produce?\nAnswer: ATP.');
  assert.equal(parsed.format,'qa');assert.equal(parsed.rows.length,2);
  assert.equal(parsed.rows[0].answer,'The proton gradient.\nIt provides free energy.');
});

test('CSV handles comma, embedded newline and doubled quotes without splitting an answer',()=>{
  const csv='Question,Answer,Lecture,Type,Course\r\n"What is osmosis?","Water moves, without ATP.\nAcross a semipermeable membrane.",Lecture 5,Explain,AP Biology\r\n"What does \"\"ATP\"\" stand for?","Adenosine triphosphate.",Lecture 5,Recall,AP Biology';
  const result=Q.parse(csv,{format:'csv'});
  assert.equal(result.rows.length,2);
  assert.match(result.rows[0].answer,/without ATP\.\nAcross/);
  assert.equal(result.rows[1].question,'What does "ATP" stand for?');
  assert.equal(result.rows[0].kind,'explain');
  assert.equal(result.rows[0].lectureTitle,'Lecture 5');
});

test('spreadsheet tab paste recognises headers, lecture metadata and type',()=>{
  const result=Q.parse('\uFEFFQuestion\tAnswer\tLecture\tType\nWhat is ATP?\tAn energy carrier.\tLecture 1\tRecall', {format:'auto'});
  assert.equal(result.format,'tsv');
  assert.equal(result.rows[0].lectureTitle,'Lecture 1');
  assert.equal(result.rows[0].kind,'recall');
});

test('two-column CSV without header is accepted for simple question lists',()=>{
  const result=Q.parse('What is ATP?,A nucleotide.\nWhat is NADH?,An electron carrier.',{format:'csv'});
  assert.equal(result.rows.length,2);
  assert.equal(result.rows[1].answer,'An electron carrier.');
});

test('ordinary prose containing a comma is not mistaken for pasted questions',()=>{
  assert.throws(()=>Q.parse('A cell contains many parts, including membranes and ribosomes.'),/Plain notes are not automatically treated/);
});

test('JSON arrays and questions wrappers are accepted without code evaluation',()=>{
  const a=Q.parse('[{"question":"What is ATP?","answer":"A molecule."}]');
  const b=Q.parse('{"questions":[{"Q":"What is DNA?","A":"A polymer.","lecture":"Genetics"}]}');
  assert.equal(a.rows.length,1);assert.equal(b.rows[0].lectureTitle,'Genetics');
});

test('broken CSV quoting, missing answers, unknown types and malformed JSON are rejected',()=>{
  assert.throws(()=>Q.parse('Question,Answer\n"unclosed,answer',{format:'csv'}),/Unclosed/);
  assert.throws(()=>Q.parse('Q: What is ATP?'),/Every Q:/);
  assert.throws(()=>Q.parse('Question,Answer,Type\nWhat is ATP?,A molecule.,MAGIC',{format:'csv'}),/unknown practice type/);
  assert.throws(()=>Q.parse('{broken}',{format:'json'}),/JSON file is not valid/);
});

test('200 entries are allowed and 201 rejected before any database write',()=>{
  const rows=Array.from({length:200},(_,i)=>`Q: What is concept ${i}?\nA: Definition ${i}.`).join('\n\n');
  assert.equal(Q.parse(rows).rows.length,200);
  assert.throws(()=>Q.parse(rows+'\nQ: One more?\nA: No.'),/200/);
});

test('preview leaves requirements, scheduling and attempt history untouched',()=>{
  const {db,course}=fixture();
  const before=JSON.stringify(db);
  const p=C.previewManualQuestionImport(db,{courseId:course.id,text:'Question,Answer,Lecture,Type\nWhat is ATP?,Energy carrier.,Lecture 1,Recall',format:'csv'});
  assert.equal(p.rows.length,1);
  assert.equal(p.rows[0].lectureTitle,'Lecture 1');
  assert.equal(JSON.stringify(db),before);
});

test('confirmed file rows keep lecture names and custom kinds and enter unified study queue',()=>{
  const {db,course}=fixture();
  const csv='Question,Answer,Lecture,Type\nWhat is ATP?,A nucleotide.,Lecture 1,Recall\nWhat is NADH?,An electron carrier.,Lecture 2,Explain';
  const saved=C.importManualQuestionList(db,{courseId:course.id,text:csv,format:'csv'});
  assert.equal(saved.length,2);
  assert.equal(saved[0].lectureTitle,'Lecture 1');
  assert.equal(saved[1].lectureTitle,'Lecture 2');
  assert.equal(saved[1].kind,'explain');
  assert.equal(C.eligibleCandidates(db).length,2);
  assert.equal(C.validateImport(JSON.parse(JSON.stringify(db))).schemaVersion,5);
});

test('file course mismatches and conflicting lecture-source associations are blocked',()=>{
  const {db,course}=fixture();
  const chemistry=C.addCourse(db,'AP Chemistry');
  const source=C.addSource(db,{courseId:course.id,title:'Lecture 1 — Cells',content:'Cell membranes have phospholipids.',generateDrafts:false}).source;
  assert.throws(()=>C.importManualQuestionList(db,{courseId:course.id,text:'Question,Answer,Course\nWhat is a cell?,A biological unit.,AP Chemistry',format:'csv'}),/different course/);
  assert.throws(()=>C.previewManualQuestionImport(db,{courseId:course.id,sourceId:source.id,text:'Question,Answer,Lecture\nWhat is ATP?,Energy carrier.,Lecture 7',format:'csv'}),/differs from the selected notes/);
  assert.equal(chemistry.name,'AP Chemistry');
  assert.equal(db.requirements.length,0);
});

test('duplicate entries and stale previews cannot cause partial imports',()=>{
  const {db,course}=fixture();
  const csv='Question,Answer\nWhat is ATP?,A nucleotide.\nWhat is ATP?,Energy carrier.';
  assert.throws(()=>C.importManualQuestionList(db,{courseId:course.id,text:csv,format:'csv'}),/Repeated question/);
  assert.equal(db.requirements.length,0);
  const list='Q: What is ATP?\nA: A nucleotide.\n\nQ: What is NADH?\nA: A carrier.';
  C.previewManualQuestionImport(db,{courseId:course.id,text:list});
  C.addRequirement(db,{courseId:course.id,question:'What is ATP?',answer:'A nucleotide.'});
  assert.throws(()=>C.importManualQuestionList(db,{courseId:course.id,text:list}),/Repeated question/);
  assert.equal(db.requirements.length,1);
});
