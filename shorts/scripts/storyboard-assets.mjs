import fs from 'node:fs/promises';
import path from 'node:path';

export async function pathExists(filename) {
  try {
    await fs.access(filename);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
}

export async function motionFrameNames(directory, stem) {
  const names = [`${stem}-initial.png`, `${stem}-change.png`];
  const present = await Promise.all(names.map(name => pathExists(path.join(directory, name))));
  return present.every(Boolean) ? names : [];
}
