import test from 'node:test';
import assert from 'node:assert/strict';
import { runChild } from '../src/child-process-policy.js';

test('external intelligence subprocesses do not inherit arbitrary secrets',()=>{
  const key='SHIPSTATE_TEST_SECRET_FOR_CHILD_POLICY',prior=process.env[key];process.env[key]='should-not-leak';
  try{
    const hidden=runChild(process.execPath,['-e',`process.stdout.write(process.env.${key}||'missing')`],{timeout:5000});assert.equal(hidden.status,0);assert.equal(hidden.stdout,'missing');
    const allowed=runChild(process.execPath,['-e',`process.stdout.write(process.env.${key}||'missing')`],{timeout:5000,envAllow:[key]});assert.equal(allowed.status,0);assert.equal(allowed.stdout,'should-not-leak');
  }finally{if(prior===undefined)delete process.env[key];else process.env[key]=prior;}
});
