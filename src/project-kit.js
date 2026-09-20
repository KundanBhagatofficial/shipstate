import fs from 'node:fs';
import path from 'node:path';
import { readJson,writeJsonAtomic } from './utils.js';

export const PROJECT_CONFIG='shipstate.project.json';
export const PROJECT_DOC_DIR='docs/shipstate';
export const PROJECT_CONTRACT_SCHEMA=2;
export const CONTROL_PATHS=[PROJECT_CONFIG,`${PROJECT_DOC_DIR}/**`];

export const REQUIRED_DOCUMENTS=Object.freeze([
  {key:'product',file:'PRODUCT.md',decision:'product_scope'},
  {key:'features',file:'FEATURES.md',decision:'feature_scope'},
  {key:'ux',file:'UX.md',decision:'ux_design'},
  {key:'frontend',file:'FRONTEND.md',decision:'frontend_implementation'},
  {key:'architecture',file:'ARCHITECTURE.md',decision:'architecture'},
  {key:'data',file:'DATA.md',decision:'data_model'},
  {key:'security',file:'SECURITY.md',decision:'security_model'},
  {key:'development',file:'DEVELOPMENT.md',decision:'development_strategy'},
  {key:'testing',file:'TESTING.md',decision:'testing_strategy'},
  {key:'deployment',file:'DEPLOYMENT.md',decision:'deployment_target'},
  {key:'acceptance',file:'ACCEPTANCE.md',decision:'acceptance_criteria'},
  {key:'decisions',file:'DECISIONS.md',decision:'decision_ledger'}
]);

export const REQUIRED_DECISIONS=Object.freeze([
  {key:'product_scope',label:'Product scope is final'},
  {key:'target_users',label:'Target users and primary use cases are final'},
  {key:'feature_scope',label:'Feature inventory and priorities are final'},
  {key:'ux_design',label:'UX, screens and design direction are final',allowNA:true},
  {key:'frontend_implementation',label:'Frontend implementation architecture and design-system rules are final',allowNA:true},
  {key:'architecture',label:'System architecture and technology boundaries are final'},
  {key:'data_model',label:'Data model, persistence and migration strategy are final',allowNA:true},
  {key:'security_model',label:'Authentication, authorization, secrets and security constraints are final'},
  {key:'development_strategy',label:'Repository structure, coding conventions, dependency policy and development workflow are final'},
  {key:'testing_strategy',label:'Required test and certification gates are final'},
  {key:'deployment_target',label:'Deployment environments, target and rollback strategy are final',allowNA:true},
  {key:'acceptance_criteria',label:'Project delivery and acceptance criteria are final'},
  {key:'decision_ledger',label:'Important product/technical decisions are recorded'},
  {key:'cost_policy',label:'Paid-service/dependency/cost policy is decided'},
  {key:'ai_authority',label:'Authority delegated to the AI engineering team is approved'},
  {key:'deployment_authority',label:'Deployment authority is explicitly decided'},
  {key:'release_authority',label:'Release/handover authority is explicitly decided'},
  {key:'platform_targets',label:'Target platforms and product class are explicitly decided'},
  {key:'browser_device_support',label:'Required browser/device/platform support matrix is decided',allowNA:true},
  {key:'public_discoverability',label:'Public web surfaces and discoverability requirements are decided',allowNA:true},
  {key:'quality_profile',label:'Required quality profile and non-functional gates are decided'}
]);

const TODO='<!-- SHIPSTATE:TODO replace this section before handover -->';
const templates={
  'PRODUCT.md':`# Product Specification\n\n${TODO}\n\n## Problem\nDescribe the problem being solved and why it matters.\n\n## Target Users\nDefine primary users and use cases.\n\n## Product Class and Platforms\nState whether this is web/SaaS/iOS/Android/cross-platform/other and identify the approved target platforms.\n\n## Goals\nDefine measurable product outcomes.\n\n## Non-Goals\nState what the product deliberately will not do.\n\n## Scope\nDefine the approved product boundary.\n`,
  'FEATURES.md':`# Feature Specification\n\n${TODO}\n\n## Feature Inventory\nList every approved feature with priority and acceptance intent.\n\n## Dependencies\nRecord feature dependencies and sequencing constraints.\n\n## Deferred / Out of Scope\nRecord explicitly deferred work.\n`,
  'UX.md':`# UX and UI Design\n\n${TODO}\n\n## User Flows\nDefine the approved end-to-end flows.\n\n## Screens / Surfaces\nList required screens, states and responsive behavior.\n\n## Visual Direction\nRecord layout, typography, spacing, colors, interaction patterns and visual constraints.\n\n## Platform Behavior\nRecord platform-specific navigation, safe-area, orientation, input and lifecycle behavior.\n\n## Accessibility\nRecord required accessibility behavior, including applicable keyboard/screen-reader/mobile accessibility expectations.\n`,
  'FRONTEND.md':`# Frontend Implementation Specification\n\n${TODO}\n\n## Frontend Architecture\nDefine framework, routing/navigation, state management, data-fetching and rendering boundaries.\n\n## Design System\nDefine shared tokens, primitives, components and rules preventing page-by-page visual drift.\n\n## Responsive / Platform Behavior\nDefine desktop, mobile, native/web and safe-area behavior where applicable.\n\n## Browser / Device Support\nDefine the supported browser, OS and device matrix when applicable.\n\n## Frontend Constraints\nRecord performance, accessibility, browser/device support and prohibited implementation patterns.\n`,
  'ARCHITECTURE.md':`# System Architecture\n\n${TODO}\n\n## System Context\nDescribe the system boundary and external dependencies.\n\n## Components\nDefine major components and responsibilities.\n\n## Interfaces\nDefine APIs, events and integration contracts.\n\n## Constraints\nRecord architecture decisions that implementation must not drift from.\n`,
  'DATA.md':`# Data Architecture\n\n${TODO}\n\n## Data Model\nDefine entities, ownership and relationships.\n\n## Persistence\nDefine authoritative stores, caching and offline behavior.\n\n## Migrations\nDefine schema/version migration policy.\n\n## Retention and Privacy\nDefine retention, deletion and sensitive-data handling.\n`,
  'SECURITY.md':`# Security Requirements\n\n${TODO}\n\n## Identity and Access\nDefine authentication and authorization.\n\n## Secrets\nDefine credential and secret handling.\n\n## Threat Boundaries\nDefine trust boundaries and prohibited behavior.\n\n## Security Gates\nDefine checks required before delivery.\n`,
  'DEVELOPMENT.md':`# Development Specification\n\n${TODO}\n\n## Repository Structure\nDefine source, test, generated and protected areas and package/module boundaries.\n\n## Coding Conventions\nDefine language/framework conventions, error handling, logging, configuration and documentation rules.\n\n## Dependencies and Integrations\nDefine dependency policy, external APIs/services, configuration requirements and prohibited paid/hosted dependencies.\n\n## Development Workflow\nDefine branching, migrations, generated artifacts, build requirements and implementation sequencing constraints.\n`,
  'TESTING.md':`# Testing and Quality Strategy\n\n${TODO}\n\n## Required Test Layers\nDefine unit, integration, E2E, device/browser and other required tests.\n\n## Platform Matrix\nDefine browser/device/OS coverage required for web, iOS, Android or cross-platform delivery.\n\n## Quality Gates\nDefine lint, typecheck, accessibility, responsive, coverage, performance, security and discoverability thresholds where applicable.\n\n## Certification\nDefine evidence required before release.\n`,
  'DEPLOYMENT.md':`# Deployment and Operations\n\n${TODO}\n\n## Environments\nDefine development, staging and production environments.\n\n## Deployment Target\nDefine hosting/runtime targets and required access.\n\n## Public Surfaces\nList public marketing/docs/product URLs requiring search/discoverability checks; mark authenticated/private surfaces explicitly.\n\n## Release Procedure\nDefine build, deploy and smoke-test commands/workflow.\n\n## Rollback\nDefine rollback conditions and procedure.\n`,
  'ACCEPTANCE.md':`# Project Acceptance Contract\n\n${TODO}\n\n## Delivery Criteria\nDefine what must be true for the project to be considered complete.\n\n## Required Evidence\nDefine required tests, artifacts, documentation and production checks.\n\n## Known Limitations Policy\nDefine which limitations may be accepted at handover.\n`,
  'DECISIONS.md':`# Project Decision Ledger\n\n${TODO}\n\nRecord material product, design, platform, quality, frontend, architecture, data, security, dependency, cost, development, discoverability and deployment decisions.\n\n## Decision Template\n### DEC-001 — Title\n- Status: approved\n- Decision: ...\n- Rationale: ...\n- Constraints: ...\n`
};

function defaultDecision(d){return {status:'pending',note:'',allowNA:Boolean(d.allowNA)};}
export function defaultProjectContract(){return {
  schemaVersion:PROJECT_CONTRACT_SCHEMA,
  project:{classes:[],platforms:[],publicSurfaces:[]},
  qualityProfiles:{ui:'auto',accessibility:'auto',responsive:'auto',discoverability:'auto',performance:'auto'},
  providers:{structuralContext:'auto',semanticContext:'auto',uiIntelligence:'auto',discoverability:'auto'},
  roles:{productOwner:'human',manager:'codex',reviewer:'codex',developer:'claude',verifier:'shipstate'},
  autonomy:{taskPlanning:'automatic',taskSelection:'automatic',implementation:'automatic',testing:'automatic',repairs:'automatic',integration:'automatic',dependencyChanges:'within_approved_constraints',architectureChanges:'owner_gate',securityModelChanges:'owner_gate',destructiveMigrations:'owner_gate',paidServices:'owner_gate',deployment:'owner_gate',release:'owner_gate'},
  limits:{maxRepairCycles:3,maxManagerRetries:2,maxTasksPerSession:100,managerContextTokens:40000,reviewContextTokens:20000,developerContextTokens:12000},
  delivery:{buildCommands:[],deployCommands:[],smokeCommands:[],rollbackCommands:[]},
  decisions:Object.fromEntries(REQUIRED_DECISIONS.map(d=>[d.key,defaultDecision(d)]))
};}
export function migrateProjectContract(input={}){const base=defaultProjectContract(),cfg=input||{};return {...base,...cfg,schemaVersion:PROJECT_CONTRACT_SCHEMA,project:{...base.project,...(cfg.project||{}),classes:[...(cfg.project?.classes||[])],platforms:[...(cfg.project?.platforms||[])],publicSurfaces:[...(cfg.project?.publicSurfaces||[])]},qualityProfiles:{...base.qualityProfiles,...(cfg.qualityProfiles||{})},providers:{...base.providers,...(cfg.providers||{})},roles:{...base.roles,...(cfg.roles||{})},autonomy:{...base.autonomy,...(cfg.autonomy||{})},limits:{...base.limits,...(cfg.limits||{})},delivery:{...base.delivery,...(cfg.delivery||{})},decisions:{...base.decisions,...(cfg.decisions||{})}};}
export function projectConfigPath(root=process.cwd()){return path.join(root,PROJECT_CONFIG);}
export function projectDocumentPath(root,doc){return path.join(root,PROJECT_DOC_DIR,doc.file||doc);}
export function ensureProjectKit(root=process.cwd()){const created=[];fs.mkdirSync(path.join(root,PROJECT_DOC_DIR),{recursive:true});for(const doc of REQUIRED_DOCUMENTS){const p=projectDocumentPath(root,doc);if(!fs.existsSync(p)){fs.writeFileSync(p,templates[doc.file]);created.push(path.relative(root,p));}}const cfg=projectConfigPath(root);if(!fs.existsSync(cfg)){writeJsonAtomic(cfg,defaultProjectContract());created.push(PROJECT_CONFIG);}return {created,config:readProjectContract(root)};}
export function readProjectContract(root=process.cwd()){const cfg=readJson(projectConfigPath(root));if(!cfg)throw new Error(`Missing ${PROJECT_CONFIG}. Run: shipstate handover init`);return migrateProjectContract(cfg);}
export function writeProjectContract(contract,root=process.cwd()){const migrated=migrateProjectContract(contract);writeJsonAtomic(projectConfigPath(root),migrated);return migrated;}
export function setProjectDecision(key,status,note='',root=process.cwd()){const def=REQUIRED_DECISIONS.find(d=>d.key===key);if(!def)throw new Error(`Unknown project decision: ${key}`);if(!['approved','not_applicable','pending'].includes(status))throw new Error('Decision status must be approved, not_applicable, or pending');if(status==='not_applicable'&&!def.allowNA)throw new Error(`${key} cannot be marked not_applicable`);const c=readProjectContract(root);c.decisions[key]={...(c.decisions[key]||{}),status,note:String(note||''),allowNA:Boolean(def.allowNA),decidedAt:status==='pending'?null:new Date().toISOString()};return writeProjectContract(c,root);}
export function documentStatus(root=process.cwd()){const contract=readProjectContract(root);return REQUIRED_DOCUMENTS.map(doc=>{const p=projectDocumentPath(root,doc);const exists=fs.existsSync(p);const text=exists?fs.readFileSync(p,'utf8'):'';const words=text.replace(/<!--[^]*?-->/g,' ').trim().split(/\s+/).filter(Boolean).length;const todo=/SHIPSTATE:TODO/i.test(text);const decision=contract.decisions?.[doc.decision];return {...doc,path:path.relative(root,p),exists,todo,words,complete:exists&&!todo&&words>=20,decisionStatus:decision?.status||'pending'};});}
export function readProjectDocuments(root=process.cwd(),maxCharsPerDoc=24000){return Object.fromEntries(REQUIRED_DOCUMENTS.map(doc=>{const p=projectDocumentPath(root,doc);let text='';try{text=fs.readFileSync(p,'utf8');}catch{}return [doc.key,text.length>maxCharsPerDoc?`${text.slice(0,maxCharsPerDoc)}\n\n[truncated by SHIPSTATE]`:text];}));}
