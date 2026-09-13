let token = '';
let status = null;
let state = null;
let currentView = 'now';
let currentTaskId = null;

const $ = (selector) => document.querySelector(selector);
const esc = (value='') => String(value).replace(/[&<>'"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const short = (value='') => value ? value.slice(0, 8) : '—';
const fmt = (value) => value ? new Date(value).toLocaleString() : '—';

async function api(path, options={}) {
  const headers = {'content-type':'application/json', ...(options.headers||{})};
  if ((options.method||'GET') !== 'GET') headers['x-shipstate-token'] = token;
  const response = await fetch(path, {...options, headers});
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`);
  return body;
}

function toast(message, error=false) {
  const el = $('#toast'); el.textContent = message; el.classList.remove('hidden','error'); if(error) el.classList.add('error');
  clearTimeout(toast.timer); toast.timer=setTimeout(()=>el.classList.add('hidden'),4200);
}

async function refresh() {
  [status,state] = await Promise.all([api('/api/status'),api('/api/state')]);
  $('#projectName').textContent = status.project.name;
  $('#readiness').textContent = `${status.readiness}%`;
  $('#readinessRing').style.setProperty('--progress',`${status.readiness}%`);
  const git = status.git;
  $('#gitMini').innerHTML = git.repository ? `<strong>${esc(git.branch || 'detached')}</strong><br>${esc(short(git.head))} · ${git.clean?'clean':'dirty'}` : `Git unavailable<br>${esc(git.error)}`;
  render();
  if (currentTaskId && !$('#drawer').classList.contains('hidden')) await openTask(currentTaskId, false);
}

function stateBadge(value){return `<span class="state ${esc(value)}">${esc(value)}</span>`}
function metric(label,value,hint){return `<div class="card metric"><div class="label">${label}</div><div class="value">${value}</div><div class="hint">${hint}</div></div>`}

function renderNow() {
  const next=status.next;
  const active=status.active[0];
  const focus=active || next;
  const focusLabel=active?'ACTIVE EXECUTION':'NEXT ACTION';
  const actions=focus?`<div class="inline-actions"><button class="primary" data-open-task="${esc(focus.id)}">Inspect task</button>${focus.state==='PENDING'||focus.state==='READY'||focus.state==='FAILED'||focus.state==='REJECTED'?`<button class="secondary" data-run-task="${esc(focus.id)}">Run agent</button>`:''}</div>`:'';
  const blockers=status.blockers.map((b)=>`<div class="blocker"><strong>${esc(b.id)} · ${esc(b.title)}</strong><p>${esc(b.blockedReason||'Requires intervention')}</p></div>`).join('');
  return `<div class="hero-grid">
    <div class="card next-card"><div class="next-label">${focusLabel}</div>${focus?`<div class="next-id">${esc(focus.id)} · ${stateBadge(focus.state)}</div><h2>${esc(focus.title)}</h2><p class="objective">${esc(focus.objective)}</p>${actions}`:`<div class="empty">No eligible or active task. Import tasks or resolve blockers.</div>`}</div>
    <div class="card"><div class="next-label">RELEASE PULSE</div><h2 style="font-size:42px;margin:12px 0 5px">${status.readiness}%</h2><div class="progress-track"><div class="progress-fill" style="width:${status.readiness}%"></div></div><p class="objective">Readiness is evidence-based: only accepted work counts.</p>${blockers||'<div class="muted" style="font-size:11px">No blockers detected.</div>'}</div>
  </div>
  <div class="metrics">${metric('Accepted',status.counts.ACCEPTED||0,'integrated into branch')}${metric('Verified',status.counts.VERIFIED||0,'awaiting acceptance')}${metric('Blocked',status.counts.BLOCKED||0,'needs intervention')}${metric('Runs',state.runs.length,'agent attempts recorded')}</div>
  <div class="section-head"><h2>Recent agent runs</h2><span>Latest execution evidence</span></div>
  <div class="card table-card"><div class="list">${status.recentRuns.length?status.recentRuns.slice(0,6).map(runRow).join(''):'<div class="empty">No runs yet.</div>'}</div></div>`;
}

function taskRow(task){return `<div class="row task-row clickable" data-open-task="${esc(task.id)}"><div class="mono">${esc(task.id)}</div><div><strong>${esc(task.title)}</strong><div class="muted" style="margin-top:4px">${esc(task.objective).slice(0,100)}</div></div><div>${stateBadge(task.state)}</div><div>P${task.priority??0}</div><div class="muted">${(task.dependsOn||[]).length} deps</div></div>`}
function runRow(run){return `<div class="row run-row clickable" data-open-task="${esc(run.taskId)}"><div class="mono">${esc(run.taskId)}</div><div>${esc(run.agent)}</div><div>${stateBadge(String(run.status||'unknown').toUpperCase())}</div><div class="muted">${esc((run.changedFiles||[]).join(', ')||'No changed files')}</div><div class="mono">${esc(short(run.candidateCommit||run.baseCommit))}</div></div>`}
function evidenceRow(item){return `<div class="row evidence-row"><div class="mono">${esc(item.taskId)}</div><div>${esc(item.type)}</div><div>${esc(item.source)}</div><div class="${item.status==='passed'?'ok':item.status==='failed'?'bad':'muted'}">${esc(item.status)}</div><div class="muted">${fmt(item.createdAt)}</div></div>`}

function renderTasks(){return `<div class="section-head" style="margin-top:0"><h2>Task graph</h2><span>${state.tasks.length} total tasks</span></div><div class="filters" id="taskFilters"><button class="filter active" data-filter="ALL">All</button>${['READY','RUNNING','IMPLEMENTED','VERIFIED','ACCEPTED','FAILED','BLOCKED'].map(x=>`<button class="filter" data-filter="${x}">${x}</button>`).join('')}</div><div class="card table-card"><div class="list" id="taskList">${state.tasks.length?state.tasks.map(taskRow).join(''):'<div class="empty">No tasks. Import Markdown execution contracts from System.</div>'}</div></div>`}
function renderRuns(){return `<div class="section-head" style="margin-top:0"><h2>Agent runs</h2><span>${state.runs.length} recorded attempts</span></div><div class="card table-card"><div class="list">${state.runs.length?[...state.runs].reverse().map(runRow).join(''):'<div class="empty">No agent runs yet.</div>'}</div></div>`}
function renderEvidence(){return `<div class="section-head" style="margin-top:0"><h2>Evidence ledger</h2><span>${state.evidence.length} immutable records</span></div><div class="card table-card"><div class="list">${state.evidence.length?[...state.evidence].reverse().map(evidenceRow).join(''):'<div class="empty">Evidence appears after verification.</div>'}</div></div>`}

async function renderSystemAsync() {
  const [checks,config]=await Promise.all([api('/api/doctor'),api('/api/config')]);
  $('#content').innerHTML=`<div class="settings-grid"><div class="card"><div class="section-head" style="margin-top:0"><h2>Environment</h2><span>Local only</span></div>${checks.map(c=>`<div class="doctor-line"><span>${esc(c.name)} ${c.required?'<span class="muted">required</span>':''}</span><span class="${c.available?'ok':'bad'}">${c.available?'✓':'×'} ${esc(c.version||'not found')}</span></div>`).join('')}</div>
  <div class="card"><div class="section-head" style="margin-top:0"><h2>Import task contracts</h2><span>Markdown file or directory</span></div><div class="form-row"><input class="input" id="importPath" placeholder="examples/specs or specs/TASK-001.md"><button class="primary" id="importButton">Import</button></div><p class="muted" style="font-size:10px;line-height:1.5">Existing task IDs are protected. Use CLI <span class="mono">--upsert</span> when intentionally updating inactive contracts.</p></div>
  <div class="card"><div class="section-head" style="margin-top:0"><h2>Execution defaults</h2><span>No paid service required</span></div><label class="muted" style="font-size:10px">Default agent</label><select class="select" id="agentSelect"><option value="manual">Manual / any editor</option><option value="dry-run">Dry run</option><option value="claude">Claude Code</option><option value="codex">Codex</option></select><p class="muted" style="font-size:10px;line-height:1.5">Claude and Codex are optional local executable adapters. SHIPSTATE itself has zero runtime npm dependencies.</p></div>
  <div class="card"><div class="section-head" style="margin-top:0"><h2>Recovery</h2><span>Crash-safe state repair</span></div><p class="objective">Interrupted RUNNING, VERIFYING, or ACCEPTING tasks can be returned to a safe resumable state. Orphaned worktrees can also be pruned.</p><button class="secondary" id="deepRecoverButton">Recover + prune</button></div></div>`;
  $('#agentSelect').value=config.defaultAgent||'dry-run';
  $('#agentSelect').addEventListener('change',async e=>{try{await api('/api/config',{method:'POST',body:JSON.stringify({defaultAgent:e.target.value})});toast('Default agent updated');}catch(err){toast(err.message,true)}});
  $('#importButton').addEventListener('click',async()=>{const target=$('#importPath').value.trim();if(!target)return;try{const r=await api('/api/import',{method:'POST',body:JSON.stringify({target})});toast(`Imported ${r.imported} task(s)`);await refresh();}catch(err){toast(err.message,true)}});
  $('#deepRecoverButton').addEventListener('click',async()=>{try{const r=await api('/api/recover',{method:'POST',body:JSON.stringify({prune:true})});toast(`Recovery complete: ${r.actions.length} state repair(s)`);await refresh();}catch(err){toast(err.message,true)}});
}

function render(){
  if(currentView==='now') $('#content').innerHTML=renderNow();
  else if(currentView==='tasks') $('#content').innerHTML=renderTasks();
  else if(currentView==='runs') $('#content').innerHTML=renderRuns();
  else if(currentView==='evidence') $('#content').innerHTML=renderEvidence();
  else if(currentView==='system'){renderSystemAsync();return;}
  bindDynamic();
}

function bindDynamic(){
  document.querySelectorAll('[data-open-task]').forEach(el=>el.addEventListener('click',()=>openTask(el.dataset.openTask)));
  document.querySelectorAll('[data-run-task]').forEach(el=>el.addEventListener('click',e=>{e.stopPropagation();runTaskAction(el.dataset.runTask)}));
  document.querySelectorAll('[data-filter]').forEach(el=>el.addEventListener('click',()=>{document.querySelectorAll('[data-filter]').forEach(x=>x.classList.remove('active'));el.classList.add('active');const filter=el.dataset.filter;$('#taskList').innerHTML=state.tasks.filter(t=>filter==='ALL'||t.state===filter).map(taskRow).join('')||'<div class="empty">No tasks in this state.</div>';bindDynamic()}));
}

function actionButtons(task){
  const buttons=[];
  if(['PENDING','READY','FAILED','REJECTED'].includes(task.state)) buttons.push(`<button class="primary" data-action="run">Run agent</button>`);
  if(task.state==='IMPLEMENTED') buttons.push(`<button class="primary" data-action="verify">Verify</button>`);
  if(task.state==='VERIFIED') buttons.push(`<button class="primary" data-action="accept">Accept into branch</button>`);
  if(['IMPLEMENTED','VERIFIED','FAILED','BLOCKED'].includes(task.state)) buttons.push(`<button class="danger" data-action="reject">Reject</button>`);
  if(task.state==='BLOCKED') buttons.push(`<button class="secondary" data-action="unblock">Unblock</button>`);
  buttons.push(`<button class="ghost" data-action="context">Compile context</button>`);
  return buttons.join('');
}

async function openTask(id, show=true){
  currentTaskId=id; const detail=await api(`/api/task/${encodeURIComponent(id)}`); const t=detail.task;
  $('#drawerTitle').textContent=`${t.id} · ${t.title}`;
  $('#drawerBody').innerHTML=`<div>${stateBadge(t.state)} <span class="muted" style="font-size:10px;margin-left:8px">Priority ${t.priority||0}</span></div><p class="objective">${esc(t.objective)}</p><div class="detail-actions">${actionButtons(t)}</div>
  ${t.blockedReason?`<div class="blocker"><strong>Blocked</strong><p>${esc(t.blockedReason)}</p></div>`:''}
  <div class="detail-section"><h3>Acceptance criteria</h3>${t.acceptanceCriteria?.length?`<ul>${t.acceptanceCriteria.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:'<p>None defined.</p>'}</div>
  <div class="detail-section"><h3>Verification contract</h3>${t.verification?.length?`<div class="codeblock">${esc(t.verification.join('\n'))}</div>`:'<p class="bad">No verification commands defined.</p>'}</div>
  <div class="detail-section"><h3>Path policy</h3><p><strong>Allowed:</strong> ${esc((t.allowedPaths||[]).join(', ')||'all non-protected paths')}<br><strong>Protected:</strong> ${esc((t.protectedPaths||[]).join(', ')||'project defaults only')}</p></div>
  <div class="detail-section"><h3>Run history</h3>${detail.runs.length?detail.runs.map(r=>`<div class="mini-card"><div class="top"><span>${esc(r.agent)} · ${stateBadge(String(r.status).toUpperCase())}</span><span class="mono">${esc(short(r.id))}</span></div><p>${fmt(r.startedAt)} · ${(r.changedFiles||[]).length} changed file(s) · candidate ${esc(short(r.candidateCommit))}</p>${r.worktreePath?`<p class="mono">${esc(r.worktreePath)}</p>`:''}${r.failureFingerprint?`<p class="bad">Failure ${esc(r.failureFingerprint)}</p>`:''}</div>`).join(''):'<p>No runs yet.</p>'}</div>
  <div class="detail-section"><h3>Evidence</h3>${detail.evidence.length?detail.evidence.slice(0,12).map(e=>`<div class="mini-card"><div class="top"><span>${esc(e.type)} · ${esc(e.source)}</span><span class="${e.status==='failed'?'bad':e.status==='passed'?'ok':'muted'}">${esc(e.status)}</span></div><p>${fmt(e.createdAt)}${e.summary?` · ${esc(e.summary)}`:''}</p></div>`).join(''):'<p>No evidence yet.</p>'}</div>`;
  $('#drawerBody').querySelectorAll('[data-action]').forEach(btn=>btn.addEventListener('click',()=>taskAction(id,btn.dataset.action)));
  if(show){$('#drawer').classList.remove('hidden');$('#drawerBackdrop').classList.remove('hidden')}
}

async function taskAction(id,action){
  try{
    if(action==='run') return runTaskAction(id);
    if(action==='context'){const r=await api(`/api/task/${id}/context`,{method:'POST',body:'{}'});toast(`Context: ${r.bytes} bytes · ~${r.estimatedTokens} tokens · ${r.files.length} files`);return}
    if(action==='verify'){toast('Running deterministic verification…');await api(`/api/task/${id}/verify`,{method:'POST',body:'{}'});toast('Verification passed');}
    if(action==='accept'){if(!confirm(`Accept verified ${id} into the current Git branch?`))return;await api(`/api/task/${id}/accept`,{method:'POST',body:'{}'});toast(`${id} accepted into branch`);}
    if(action==='reject'){const reason=prompt('Reason for rejection?','Needs revision');if(reason===null)return;await api(`/api/task/${id}/reject`,{method:'POST',body:JSON.stringify({reason})});toast(`${id} rejected`);}
    if(action==='unblock'){await api(`/api/task/${id}/unblock`,{method:'POST',body:'{}'});toast(`${id} unblocked`);}
    await refresh();
  }catch(err){toast(err.message,true);await refresh()}
}

async function runTaskAction(id){
  const configured=(await api('/api/config')).defaultAgent||'dry-run';
  const agent=prompt('Agent to execute (manual, dry-run, claude, codex):',configured); if(!agent)return;
  try{toast(`${agent} is executing ${id} in an isolated worktree…`);await api(`/api/task/${id}/run`,{method:'POST',body:JSON.stringify({agent})});toast(`${id} execution finished`);await refresh();}catch(err){toast(err.message,true);await refresh()}
}

function closeDrawer(){currentTaskId=null;$('#drawer').classList.add('hidden');$('#drawerBackdrop').classList.add('hidden')}

document.querySelectorAll('#nav button').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('#nav button').forEach(x=>x.classList.remove('active'));btn.classList.add('active');currentView=btn.dataset.view;render()}));
$('#refreshButton').addEventListener('click',()=>refresh().catch(e=>toast(e.message,true)));
$('#closeDrawer').addEventListener('click',closeDrawer);$('#drawerBackdrop').addEventListener('click',closeDrawer);
$('#recoverButton').addEventListener('click',async()=>{try{const r=await api('/api/recover',{method:'POST',body:'{}'});toast(`Recovery complete: ${r.actions.length} repair(s)`);await refresh()}catch(e){toast(e.message,true)}});
$('#nextButton').addEventListener('click',()=>{const next=status?.active?.[0]||status?.next;if(next)openTask(next.id);else toast('No eligible task')});

(async()=>{try{const meta=await api('/api/meta');token=meta.token;await refresh()}catch(e){toast(e.message,true);$('#content').innerHTML=`<div class="card"><h2>Unable to load SHIPSTATE</h2><p class="objective">${esc(e.message)}</p></div>`}})();
