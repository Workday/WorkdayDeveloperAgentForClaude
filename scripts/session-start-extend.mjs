#!/usr/bin/env node

/**
 * SessionStart hook: if cwd is a Workday Extend app, tell Claude to load the
 * workday-developer-agent skill.
 *
 * Detection (see extend-app.mjs): walk up from cwd looking for
 * `appManifest.json`. When it is not an Extend app, stay silent (exit 0, no
 * stdout). Fail open on parse errors so a crash cannot wedge session start.
 */
import path from 'node:path';
import { findAppRoot, MANIFEST } from './extend-app.mjs';

function allowSilently() {
  process.exit(0);
}

function instruct(appRoot) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'SessionStart',
        additionalContext:
          `This working directory is a Workday Extend app at ${appRoot} (it has ${MANIFEST}). ` +
          `Invoke the \`workday-developer-agent\` skill now and follow it for this session. ` +
          `Delegate building or changing the app to \`call_workday_developer_agent\`; ` +
          `do not edit Extend app files directly.`,
      },
    })
  );
  process.exit(0);
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

let payload;
try {
  payload = JSON.parse(await readStdin());
} catch {
  allowSilently();
}

const cwd = typeof payload?.cwd === 'string' && payload.cwd.length > 0 ? payload.cwd : process.cwd();
const appRoot = findAppRoot(path.resolve(cwd));
if (!appRoot) allowSilently();

instruct(appRoot);
