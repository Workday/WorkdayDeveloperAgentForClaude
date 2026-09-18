#!/usr/bin/env node

/**
 * Preflight for using the Workday Developer Agent from Claude Code.
 *
 * Prints one machine-readable line per check:
 *   CHECK <name> <PASS|FAIL|WARN> <detail>
 * Exits non-zero if any check FAILed.
 *
 * Usage: node dev-agent-doctor.mjs
 *
 * Runs on the plain system `node` — no dependencies, no wdcli imports. It only covers what
 * the MCP tool cannot report itself (wdcli missing, too old, or signed out). IDE window
 * problems are diagnosed by `call_workday_developer_agent` at call time; the IDE checks
 * here are soft signals and never FAIL.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const workdayDir = path.join(os.homedir(), '.workday');
const EXTENSION_ID = 'workday.workday-developer-agent-extension';
const isWindows = process.platform === 'win32';

let failed = false;

function check(name, status, detail) {
  if (status === 'FAIL') failed = true;
  console.log(`CHECK ${name.padEnd(20)} ${status.padEnd(4)} ${detail}`);
}

function note(text) {
  console.log(`\n${text}`);
}

/** Runs a command, returning {ok, stdout}. `shell` on Windows so `.cmd` shims resolve. */
function run(cmd, args) {
  const result = spawnSync(cmd, args, {
    encoding: 'utf8',
    shell: isWindows,
    windowsHide: true,
  });
  const stdout = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();
  return { ok: result.error === undefined && result.status === 0, stdout };
}

// ---------------------------------------------------------------- 1. wdcli present

// `command -v` is a shell builtin, so it has to go through `sh`.
const which = isWindows ? run('where', ['wdcli']) : run('sh', ['-c', 'command -v wdcli']);
if (!which.ok || !which.stdout) {
  check('wdcli-installed', 'FAIL', 'wdcli not found on PATH');
  note(
    'Stopping: without wdcli the MCP server cannot start. Install it, then RESTART Claude Code.'
  );
  process.exit(1);
}
const wdcliPath = which.stdout.split(/\r?\n/)[0].trim();
const version = run('wdcli', ['--version']).stdout.match(/@workday\/wdcli\/\S+/)?.[0];
check('wdcli-installed', 'PASS', `${wdcliPath} ${version ?? '(version unknown)'}`);

// ---------------------------------------------------------------- 2. wdcli mcp exists

if (run('wdcli', ['mcp', '--help']).ok) {
  check('wdcli-mcp', 'PASS', "'wdcli mcp' available");
} else {
  check(
    'wdcli-mcp',
    'FAIL',
    "this wdcli has no 'mcp' command - upgrade wdcli, then RESTART Claude Code"
  );
}

// ---------------------------------------------------------------- 3. signed in

const whoami = run('wdcli', ['whoami']);
if (whoami.ok) {
  check('wdcli-auth', 'PASS', whoami.stdout.split(/\r?\n/)[0]);
} else {
  check(
    'wdcli-auth',
    'FAIL',
    "not signed in - run 'wdcli auth login' or call the login_workday_extend tool"
  );
}

// ---------------------------------------------------------------- 4. IDE extension (soft)

// Either CLI may be missing from PATH even when the IDE is installed, so a miss is a WARN.
const ideClis = ['code', 'cursor']
  .map((cli) => ({ cli, result: run(cli, ['--list-extensions']) }))
  .filter(({ result }) => result.ok);
if (ideClis.length === 0) {
  check('ide-extension', 'WARN', "neither 'code' nor 'cursor' is on PATH - could not check");
} else {
  const withExtension = ideClis
    .filter(({ result }) => result.stdout.toLowerCase().includes(EXTENSION_ID))
    .map(({ cli }) => cli);
  if (withExtension.length > 0) {
    check('ide-extension', 'PASS', `${EXTENSION_ID} installed (${withExtension.join(', ')})`);
  } else {
    check(
      'ide-extension',
      'WARN',
      `${EXTENSION_ID} not listed by ${ideClis.map(({ cli }) => cli).join(', ')}`
    );
  }
}

// ---------------------------------------------------------------- 5. workday dir (soft)

if (fs.existsSync(workdayDir)) {
  check('workday-dir', 'PASS', workdayDir);
} else {
  check(
    'workday-dir',
    'WARN',
    `${workdayDir} missing - the extension may never have run in this environment`
  );
}

process.exit(failed ? 1 : 0);
