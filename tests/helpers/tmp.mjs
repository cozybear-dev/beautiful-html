// A temporary folder that is removed when the test process ends. A run of the
// tests writes hundreds of megabytes of assembled reports, screenshots and
// PDFs; left behind, a few dozen runs fill the disk.
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const made = [];
process.on('exit', () => { for (const dir of made) { try { rmSync(dir, { recursive: true, force: true }); } catch { /* the system clears it later */ } } });

export function tempDir(prefix) {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  made.push(dir);
  return dir;
}
