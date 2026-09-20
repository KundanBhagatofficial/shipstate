import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveStaticFile } from '../src/server.js';

const webRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../web');

test('static file resolver stays inside the dashboard web root',()=>{
 assert.equal(resolveStaticFile(webRoot,'/'),path.join(webRoot,'index.html'));
 assert.equal(resolveStaticFile(webRoot,'/styles.css'),path.join(webRoot,'styles.css'));
 assert.equal(resolveStaticFile(webRoot,'/../package.json'),null);
 assert.equal(resolveStaticFile(webRoot,'/%2e%2e%2fpackage.json'),null);
 assert.equal(resolveStaticFile(webRoot,'/%E0%A4%A'),null);
});
