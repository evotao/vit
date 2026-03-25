// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 sol pbc

import { existsSync, mkdirSync, symlinkSync, unlinkSync, writeFileSync, readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { homedir } from 'node:os';
import { which } from '../lib/compat.js';
import { mark, name } from '../lib/brand.js';

const VIT_BIN = resolve(dirname(new URL(import.meta.url).pathname), '../../bin/vit.js');

function binDir() {
  if (process.platform === 'win32') {
    // prefer ~/.local/bin on Windows too; npm's prefix dir is a fallback
    const local = join(homedir(), '.local', 'bin');
    if (existsSync(local)) return local;
    // fall back to npm global bin if available
    try {
      return execFileSync('npm', ['bin', '-g'], {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      }).trim();
    } catch { /* fall through */ }
    return local; // create it
  }
  return join(homedir(), '.local', 'bin');
}

function isOnPath(dir) {
  const sep = process.platform === 'win32' ? ';' : ':';
  return (process.env.PATH || '').split(sep).some(p => resolve(p) === resolve(dir));
}

function pathHint(dir) {
  const shell = process.env.SHELL || '';
  if (shell.endsWith('fish')) return `  set -Ua fish_user_paths ${dir}`;
  if (shell.endsWith('zsh')) return `  echo 'export PATH="${dir}:$PATH"' >> ~/.zshrc`;
  if (process.platform === 'win32') return `  [Environment]::SetEnvironmentVariable("PATH", "${dir};$env:PATH", "User")`;
  return `  echo 'export PATH="${dir}:$PATH"' >> ~/.bashrc`;
}

export function linkVit(opts = {}) {
  const { verbose } = opts;
  const dir = binDir();
  mkdirSync(dir, { recursive: true });

  if (process.platform === 'win32') {
    // write a .cmd shim like npm does
    const shim = join(dir, 'vit.cmd');
    const content = `@ECHO off\r\nnode "${VIT_BIN}" %*\r\n`;
    writeFileSync(shim, content);
    if (verbose) console.log(`[verbose] wrote ${shim}`);
    console.log(`${mark} linked: ${shim} -> ${VIT_BIN}`);
  } else {
    const target = join(dir, 'vit');
    // remove existing symlink if present
    if (existsSync(target)) {
      try {
        const existing = readFileSync(target, 'utf-8').slice(0, 2);
        // only remove if it's a symlink or our shim, not some other binary
        unlinkSync(target);
      } catch {
        unlinkSync(target);
      }
    }
    symlinkSync(VIT_BIN, target);
    if (verbose) console.log(`[verbose] symlinked ${target} -> ${VIT_BIN}`);
    console.log(`${mark} linked: ${target} -> ${VIT_BIN}`);
  }

  if (!isOnPath(dir)) {
    console.log('');
    console.log(`${mark} ${dir} is not on your PATH. add it:`);
    console.log(pathHint(dir));
    console.log('');
    console.log('then restart your shell.');
  } else {
    // verify the link works
    const vitPath = which('vit');
    if (vitPath) {
      console.log(`${mark} verified: ${vitPath}`);
    }
  }
}

export default function register(program) {
  program
    .command('link')
    .description(`Link ${name} source checkout to system PATH`)
    .option('-v, --verbose', 'Show step-by-step details')
    .action((opts) => {
      try {
        linkVit(opts);
      } catch (err) {
        console.error(err instanceof Error ? err.message : String(err));
        process.exitCode = 1;
      }
    });
}
