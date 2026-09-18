---
name: workday-developer-agent
description: 'Delegate building or changing a Workday Extend app to the Workday Developer Agent, which runs in the user''s IDE panel. Use when the user wants to create, scaffold, edit, understand, fix, or enhance a Workday Extend app in a project open in VS Code or Cursor. Triggers on: "Workday Extend", "Extend app", "developer agent", "build my Extend app", "scaffold a page/component", "add a business object", "WQL", plus any request to change Extend files (non-exhaustive list: presentation - pmd/pod/amd/smd/card/extendcard/script/wql/graphql, model - businessobject/businessprocess/securitydomain, orchestration, attributestore) in an Extend project the user has open.'
---

# Workday Developer Agent

The **Workday Developer Agent** is Workday's purpose-built agent for developing
Workday Extend apps. It understands Extend app structure (pmd/pod/amd/smd, presentations, business
objects, WQL, endpoints, app manifests) and does the actual file work. It runs **inside the
Developer Agent panel in the user's IDE** (VS Code / Cursor), where the user sees the live session
and approves every edit. It is exposed to Claude Code as MCP tools, not as a library Claude Code
calls into directly.

When a task involves building or modifying an Extend app in the user's open project, **delegate it
to the Developer Agent** rather than editing Extend files yourself. The domain logic, scaffolding
contracts, and validation live in the agent; that's where the work belongs.

## When to delegate

Delegate to the Developer Agent when the user wants to:

- Create or scaffold an Extend app, page, presentation, component, or business object.
- Edit, fix, refactor, or extend existing Extend app files.
- Wire up WQL queries, endpoints, or app-model changes.

For purely informational questions, you may choose to rely on your own knowledge of Workday Extend
if you are confident. Otherwise, defer to Developer Agent which is grounded and purpose-built
to understand Workday Extend. For modifications, delegate to Developer Agent immediately.

## Interaction pattern: delegate, don't touch

Claude Code's role here is a delegator, not a collaborator working the same files:

- Once a task is handed to Developer Agent, do **not** read, search, or edit files inside the workspace
  Developer Agent is working on until its run completes. Developer Agent may be mid-edit; reading stale content
  leads to wrong assumptions, and editing concurrently can conflict with or clobber its changes.
- Treat Developer Agent as a black box for that workspace slice. Learn what changed from the result it
  returns — its final reply, plus the "Files edited" and "Files read" sections — rather than by
  re-scanning the workspace yourself.
- If you need to verify or build on Developer Agent's work after it finishes, that's fine — the "don't
  touch" rule applies only while a run for that workspace is in flight.
- Thread continuity is automatic and you do not control it: the tool keys a sticky thread off the
  resolved `directory`, so repeated calls for the same project continue the same Developer Agent
  conversation and keep its context. There is no conversation ID to pass back.

## How to delegate

Use the **`call_workday_developer_agent`** tool (from the `workday-developer-agent` MCP server). It takes
exactly two arguments:

- `directory`: the absolute path to the Extend project the user has open in the IDE.
- `prompt`: the task, phrased as a clear instruction for the agent.

The tool runs one Developer Agent turn in the IDE panel, streams progress, and returns the agent's
final summary followed by the files it edited and read. If the panel isn't running yet, the tool
launches it and brings it to the foreground itself — there is no separate launch tool, so to open
the panel without doing work, just send the turn you actually want. The first call for a project
starts a fresh Developer Agent thread; later calls in the session continue it, so the user's own
open thread is never disturbed.

## Approvals happen in the panel

The user reviews diffs and approves (or rejects) every gated edit **in the Developer Agent panel** —
not in Claude Code. Do not attempt to reproduce diffs or approval prompts here. After a turn
completes, summarize what the agent did and point the user to the panel to review the changes.

## Requirements

The user must have:

1. The Workday CLI (`wdcli`) installed and signed in.
2. The Workday Developer Agent extension installed in VS Code or Cursor and signed in.
3. The Extend project open in that IDE window.

If a delegation call fails, relay the guidance in the tool's error message first — it covers IDE
and window problems and is the most current source. If the Developer Agent tools are missing
entirely, the error doesn't say what to do, or the user reports trouble installing or signing in,
read `references/setup.md` in this skill directory before responding — it maps each symptom to its
fix, including the Claude Code restart that some of them require.
