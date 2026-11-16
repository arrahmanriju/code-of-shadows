// Explicit local smoke test. Sends fixed professional questions, never credentials.
const url = process.argv[2] || 'http://localhost:3000';
if(!['localhost','127.0.0.1','[::1]'].includes(new URL(url).hostname)) throw new Error('Use a local development URL.');
const questions = ['About Azizur Rahman','Tell me about Azizur','Who is Azizur Rahman?','Introduce Azizur','Tell me about yourself','What is his education?','What are his AI/ML projects?','What are his technical skills?','Tell me about ICPC','What is the capital of France?'];
for(const question of questions) {
  const response = await fetch(new URL('/api/chat',url),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question})});
  const data = await response.json();
  console.log(JSON.stringify({question,status:response.status,source:data.source,documentIds:data.documentIds,errorCode:data.errorCode,answer:data.answer}));
  if(!response.ok || (question===questions.at(-1) ? data.errorCode!=='NO_CONTEXT' : data.source!=='gemini')) process.exitCode=1;
}
