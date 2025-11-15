import { cp, mkdir, rm, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(process.cwd());
const publicDir = resolve(root, 'public');
const sourceAssets = resolve(root, 'assets');
const targetAssets = resolve(publicDir, 'assets');
const swSource = resolve(sourceAssets, 'sw.js');
const swTarget = resolve(publicDir, 'sw.js');
const workerSource = resolve(root, 'worker.js');
const workerTarget = resolve(publicDir, 'worker.js');

async function ensureDir(dir) {
  await mkdir(dir, { recursive: true });
}

async function copyRecursive(src, dest) {
  await rm(dest, { recursive: true, force: true });
  await ensureDir(dest);
  await cp(src, dest, { recursive: true });
}

async function copyFile(src, dest) {
  try {
    await stat(src);
  } catch (error) {
    console.error(`Missing source file: ${src}`);
    throw error;
  }
  await cp(src, dest, { recursive: false });
}

await ensureDir(publicDir);
await copyRecursive(sourceAssets, targetAssets);
await copyFile(swSource, swTarget);
await copyFile(workerSource, workerTarget);

console.log('Assets synced to public/.');
