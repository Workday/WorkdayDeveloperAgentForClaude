import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const hook = fileURLToPath(new URL('../scripts/session-start-extend.mjs', import.meta.url));
const doctor = fileURLToPath(new URL('../scripts/dev-agent-doctor.mjs', import.meta.url));

function tempDir(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'plugin-check-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

test('SessionStart walks past a directory named appManifest.json', (t) => {
  const root = tempDir(t);
  const child = path.join(root, 'child');
  fs.mkdirSync(path.join(child, 'appManifest.json'), { recursive: true });
  const invoke = () => {
    const result = spawnSync(process.execPath, [hook], {
      input: JSON.stringify({ cwd: child }), encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout;
  };

  assert.equal(invoke(), '');
  fs.writeFileSync(path.join(root, 'appManifest.json'), '{}');
  assert.ok(JSON.parse(invoke()).hookSpecificOutput.additionalContext.includes('at ' + root + ' ('));
});

test('doctor matches a complete ID in a multiline extension list', (t) => {
  const dir = tempDir(t);
  const win = process.platform === 'win32';
  const shim = (name, windows, unix) => {
    fs.writeFileSync(path.join(dir, name + (win ? '.cmd' : '')),
      win ? '@echo off\r\n' + windows : '#!/bin/sh\n' + unix, { mode: 0o755 });
  };
  shim('wdcli', 'echo ready', 'echo ready');
  shim('cursor', 'exit /b 1', 'exit 1');
  if (!win) fs.symlinkSync('/bin/sh', path.join(dir, 'sh'));
  const env = win
    ? { SystemRoot: process.env.SystemRoot, PATH: dir + ';' + path.join(process.env.SystemRoot, 'System32'),
        PATHEXT: '.EXE;.CMD', USERPROFILE: dir }
    : { PATH: dir, HOME: dir };

  const id = 'workday.workday-developer-agent';
  const runWith = (list) => {
    const lines = list.map((item) => 'echo ' + item);
    shim('code', lines.join('\r\n'), lines.join('\n'));
    const result = spawnSync(process.execPath, [doctor], { cwd: dir, env, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout;
  };
  assert.match(runWith([id + '-preview', 'other.' + id]), /CHECK ide-extension\s+WARN/);
  assert.match(runWith(['other.package', id.toUpperCase()]), /CHECK ide-extension\s+PASS/);
});
