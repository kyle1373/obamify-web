import { access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';

const wasmDir = resolve(process.cwd(), 'public/wasm');
const wasmJs = resolve(wasmDir, 'obamify.js');
const wasmBin = resolve(wasmDir, 'obamify_bg.wasm');

async function exists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function runTrunkBuild() {
  return new Promise((resolve, reject) => {
    const args = ['build', '--release', '--dist', 'public/wasm', '--public-url', '/wasm/'];
    const child = spawn('trunk', args, { stdio: 'inherit' });
    child.on('error', (error) => {
      reject(error);
    });
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`trunk build exited with code ${code}`));
      }
    });
  });
}

const hasJs = await exists(wasmJs);
const hasBin = await exists(wasmBin);

if (hasJs && hasBin) {
  console.log('Existing WASM bundle found.');
  process.exit(0);
}

console.log('WASM bundle missing. Running trunk build...');

try {
  await runTrunkBuild();
} catch (error) {
  console.error('\nFailed to build the WASM bundle.');
  console.error('Make sure Rust and trunk are installed (https://trunkrs.dev).');
  console.error(String(error));
  process.exit(1);
}
