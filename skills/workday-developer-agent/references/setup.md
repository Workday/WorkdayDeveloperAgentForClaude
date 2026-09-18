# Developer Agent setup & troubleshooting

Read this when the Developer Agent tools aren't there at all, or when a tool call fails and its
error message doesn't already tell you what to do. For a scripted check, run `/dev-agent-doctor`.

## The three prerequisites

1. **`wdcli`** installed, on `PATH`, and recent enough to have `wdcli mcp`.
2. **Signed in** — `wdcli whoami` exits 0.
3. **The Workday Developer Agent extension** installed and activated in the VS Code / Cursor window
   that has the project open.

They fail at different times, which is what makes them confusing: #1 fails silently at Claude Code
session start, #2 and #3 fail loudly at tool-call time.

## Symptom → diagnosis

| What you observe                                                                        | Cause                                                      | Fix                                                                           |
| --------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------- |
| No `workday-*` tools exist at all; startup notice says the MCP server failed to connect | `wdcli` missing, not on `PATH`, or too old for `wdcli mcp` | Install/upgrade `wdcli`, then **restart Claude Code**                         |
| Tool returns `Authentication required. Run login_workday_extend, then retry.`           | Not signed in                                              | Call the `login_workday_extend` tool, or have the user run `wdcli auth login` |
| Turn starts but never completes                                                         | A gated edit is waiting for approval                       | Tell the user to approve it in the Developer Agent panel                      |
| Any IDE or window error (no window found, busy, extension not active, …)                | See the tool's error message                               | Follow the guidance the tool returns                                          |

## IDE and window failures

Finding the right IDE window, and explaining why it can't be found, is handled by the
`call_workday_developer_agent` tool itself. Its error messages say what is wrong and how to fix it,
and they stay current as the tool changes. Relay that guidance to the user rather than diagnosing
IDE state yourself.

The one thing worth knowing up front: with WSL, devcontainers, Codespaces, or Remote-SSH, the
extension runs on the _remote_ side. `wdcli` (and Claude Code) must run in that same environment,
not just on the same physical machine.

## The restart trap — get this right

The plugin's `.mcp.json` spawns `wdcli mcp` **once, at Claude Code session start**. If `wdcli` was
missing or broken then, Claude Code marks the server failed and caches that for ~15 minutes.

So when the fix is in the `wdcli` row: installing it mid-session does **not** make the tools appear.
The user must restart Claude Code. Say that explicitly — telling them to "try again" sends them
into a loop where the fix looks like it didn't work.

Sign-in and IDE fixes need no restart; retry the tool right away.

## Checking by hand

```bash
command -v wdcli && wdcli --version   # 1. installed?
wdcli mcp --help                      # 2. has the MCP server?
wdcli whoami                          # 3. signed in? (exit 1 = no)
code --list-extensions | grep -i workday.workday-developer-agent-extension   # 4. extension? (or `cursor`)
```

Check 4 is only a signal: `code` / `cursor` are often not on `PATH` even when the IDE is installed.

On Windows, `command -v wdcli` becomes `where.exe wdcli`, and `grep -i` becomes `findstr /i`.
Prefer `/dev-agent-doctor` there — it handles the platform differences itself.

Sign in with `wdcli auth login` (add `-e/--environment` for `personal` or `eusovereign`; default is
`enterprise`).
