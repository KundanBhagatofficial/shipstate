const DEFAULT_FAILBACK_PROBE_MS=5*60*1000;
function uniqueAgents(values=[]){return [...new Set(values.map(x=>String(x||'').trim()).filter(Boolean))];}
export function developerPolicy(contract={},roles={}){
  const preferred=String(roles.developer||contract.roles?.developer||'claude');
  const configured=roles.developerFallbacks??contract.roles?.developerFallbacks??['codex'];
  const fallbacks=uniqueAgents(Array.isArray(configured)?configured:[configured]).filter(x=>x!==preferred);
  const probeMs=Math.max(10_000,Number(contract.limits?.developerFailbackProbeMs||DEFAULT_FAILBACK_PROBE_MS));
  return {preferred,fallbacks,probeMs};
}
export function developerCandidates(state={},policy,atMs=Date.now()){
  const all=uniqueAgents([policy.preferred,...policy.fallbacks]),failover=state.delivery?.developerFailover;
  if(!failover?.active||failover.preferred!==policy.preferred||!all.includes(failover.active))return all;
  const probeAt=Date.parse(failover.probeAfterAt||'');
  if(Number.isFinite(probeAt)&&probeAt>atMs)return uniqueAgents([failover.active,...policy.fallbacks.filter(x=>x!==failover.active),policy.preferred]);
  return all;
}
export function failoverState({preferred,active,reason,probeMs,failedRunId=null,at=new Date()}){
  const startedAt=at instanceof Date?at:new Date(at),probeAfterAt=new Date(startedAt.getTime()+Math.max(10_000,Number(probeMs)||DEFAULT_FAILBACK_PROBE_MS));
  return {preferred,active,reason,failedRunId,activatedAt:startedAt.toISOString(),probeAfterAt:probeAfterAt.toISOString()};
}
export function nextFallback(candidates,current){const i=candidates.indexOf(current);return i>=0?candidates.slice(i+1)[0]||null:null;}

export async function executeDeveloperChain({state={},policy,run,onFailover=null}){
  const candidates=developerCandidates(state,policy),attempts=[];
  for(const agent of candidates){
    const result=await run(agent);attempts.push({agent,status:result?.status||'failed',providerAvailability:result?.providerAvailability||null});
    if(result?.status==='passed')return {run:result,agent,attempts,preferredRecovered:agent===policy.preferred&&Boolean(state.delivery?.developerFailover)};
    if(!result?.providerAvailability)return {run:result,agent,attempts,preferredRecovered:false};
    const next=nextFallback(candidates,agent);if(!next)return {run:result,agent,attempts,preferredRecovered:false};
    if(onFailover)await onFailover({failedAgent:agent,nextAgent:next,reason:result.providerAvailability,run:result});
  }
  return {run:null,agent:null,attempts,preferredRecovered:false};
}
