import test from 'node:test';import assert from 'node:assert/strict';import { macProfile } from '../src/sandbox.js';import { parseClaudeAuthStatus,requiresMacKeychain } from '../src/agents.js';

test('Claude auth status JSON is parsed without exposing credentials',()=>{const r=parseClaudeAuthStatus('{"loggedIn":true,"authMethod":"claude.ai"}',0);assert.deepEqual(r,{supported:true,loggedIn:true,authMethod:'claude.ai',status:0});assert.equal(requiresMacKeychain('claude'),true);assert.equal(requiresMacKeychain('codex'),false);});

test('macOS sandbox keychain grant is opt-in and scoped',()=>{const base=macProfile('/tmp/worktree',true,{keychainAccess:false,home:'/Users/test',tmpdir:'/private/var/folders/test/T'});assert.doesNotMatch(base,/com\.apple\.securityd/);assert.doesNotMatch(base,/Library\/Keychains/);const auth=macProfile('/tmp/worktree',true,{keychainAccess:true,home:'/Users/test',tmpdir:'/private/var/folders/test/T'});assert.match(auth,/com\.apple\.SecurityServer/);assert.match(auth,/com\.apple\.securityd/);assert.match(auth,/\/Users\/test\/Library\/Keychains/);assert.match(auth,/\/private\/var\/folders\/test\/T/);});

test('Claude login failure is classified as supported host auth state',()=>{const r=parseClaudeAuthStatus('Not logged in · Please run /login',1);assert.equal(r.supported,true);assert.equal(r.loggedIn,false);});
