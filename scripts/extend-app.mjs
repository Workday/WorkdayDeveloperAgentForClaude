/**
 * Shared Extend-app detection for Claude Code hooks.
 *
 * An Extend app is any directory tree containing `appManifest.json`. A path belongs
 * to one when that file sits in its directory or any ancestor.
 */
import fs from 'node:fs';
import path from 'node:path';

export const MANIFEST = 'appManifest.json';

/** Walks up from `startDir` looking for appManifest.json. Returns the app root, or null. */
export function findAppRoot(startDir) {
  let dir = startDir;
  // path.dirname() is its own fixed point at the filesystem root, which ends the loop.
  for (;;) {
    try {
      if (fs.existsSync(path.join(dir, MANIFEST))) return dir;
    } catch {
      // Unreadable directory: keep walking rather than blocking.
    }
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}
