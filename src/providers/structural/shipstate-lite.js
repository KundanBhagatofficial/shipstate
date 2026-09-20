import { buildRepositoryIndex,selectContextFiles } from '../../context.js';

export const shipstateLiteProvider={
 id:'shipstate-lite',
 capabilities:['structural-context'],
 network:false,
 readOnly:true,
 priority:10,
 detect(){return {available:true,kind:'builtin'};},
 score(root,ctx={}){const n=Number(ctx.repositoryFiles||0);return n&&n<300?100:25;},
 query(input={},root){const index=buildRepositoryIndex(root);const task=input.task||{id:'QUERY',title:input.query||'structural context',objective:input.query||'',files:input.files||[],acceptanceCriteria:[]};const selected=selectContextFiles(task,root,index,Number(input.budgetTokens||8000));return {kind:'shipstate-lite',repositoryFiles:Object.keys(index.files).length,files:selected.selected.map(x=>({file:x.file,symbols:x.symbols||[],imports:index.files[x.file]?.imports||[],reverseImports:index.reverseImports[x.file]||[],tokens:x.tokens})),tokens:selected.tokens};}
};
