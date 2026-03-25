// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 sol pbc

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { execFileSync, execSync } from 'node:child_process';
import { parseGitUrl, toBeacon, beaconToHttps } from '../lib/beacon.js';
import { which } from '../lib/compat.js';
import { mark, brand, name } from '../lib/brand.js';

const VIT_BEACON = 'solpbc/vit';

export default function register(program) {
  program
    .command('hack')
    .description(`Clone ${name} from source, install, and link to PATH`)
    .option('-v, --verbose', 'Show step-by-step details')
    .option('--from <repo>', 'Fork or repo to clone (e.g. yourusername/vit)')
    .option('--dir <path>', 'Where to clone (default: ./vit)')
    .action(async (opts) => {
      try {
        const { verbose } = opts;
        const source = opts.from || VIT_BEACON;
        const httpsUrl = beaconToHttps(source);
        const parsed = parseGitUrl(httpsUrl);
        const dirName = opts.dir || parsed.repo;
        const dirPath = resolve(dirName);

        console.log(`${brand} — becoming a vit hacker`);
        console.log('');

        // 1. clone or fork
        if (existsSync(dirPath)) {
          console.log(`${mark} ${dirName}/ already exists, skipping clone`);
        } else {
          const ghPath = which('gh');
          const isUpstream = source === VIT_BEACON;
          if (ghPath && isUpstream) {
            // forking upstream — gh creates or reuses existing fork
            console.log(`${mark} forking ${VIT_BEACON} via gh...`);
            if (verbose) console.log(`[verbose] gh repo fork ${httpsUrl} --clone -- ${dirName}`);
            try {
              execFileSync('gh', ['repo', 'fork', httpsUrl, '--clone', '--', dirName], {
                encoding: 'utf-8',
                stdio: verbose ? 'inherit' : ['pipe', 'pipe', 'pipe'],
              });
            } catch (err) {
              // gh fork fails if you own the repo — fall back to clone
              if (verbose) console.log(`[verbose] fork failed, falling back to clone: ${(err.stderr || '').trim()}`);
              execFileSync('git', ['clone', httpsUrl, dirName], {
                encoding: 'utf-8',
                stdio: verbose ? 'inherit' : ['pipe', 'pipe', 'pipe'],
              });
            }
          } else if (ghPath) {
            // --from a specific fork — clone it, set upstream
            console.log(`${mark} cloning ${source} via gh...`);
            execFileSync('gh', ['repo', 'clone', source, dirName], {
              encoding: 'utf-8',
              stdio: verbose ? 'inherit' : ['pipe', 'pipe', 'pipe'],
            });
            // ensure upstream points to solpbc/vit
            try {
              execFileSync('git', ['remote', 'get-url', 'upstream'], {
                cwd: dirPath, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'],
              });
              if (verbose) console.log('[verbose] upstream remote already set');
            } catch {
              const upstreamUrl = beaconToHttps(VIT_BEACON);
              execFileSync('git', ['remote', 'add', 'upstream', upstreamUrl], {
                cwd: dirPath, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'],
              });
              if (verbose) console.log(`[verbose] added upstream remote: ${upstreamUrl}`);
            }
          } else {
            console.log(`${mark} cloning ${source}...`);
            execFileSync('git', ['clone', httpsUrl, dirName], {
              encoding: 'utf-8',
              stdio: verbose ? 'inherit' : ['pipe', 'pipe', 'pipe'],
            });
          }
          console.log(`${mark} cloned to ${dirName}/`);
        }

        // 2. update hack script SELF to point to this fork
        const hackPath = join(dirPath, 'hack');
        if (existsSync(hackPath)) {
          try {
            const originUrl = execFileSync('git', ['remote', 'get-url', 'origin'], {
              cwd: dirPath, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'],
            }).trim();
            const parsed2 = parseGitUrl(originUrl);
            const slug = parsed2.org ? `${parsed2.org}/${parsed2.repo}` : parsed2.repo;
            const hackText = readFileSync(hackPath, 'utf-8');
            const updated = hackText.replace(/^SELF=".*"$/m, `SELF="${slug}"`);
            if (updated !== hackText) {
              writeFileSync(hackPath, updated);
              if (verbose) console.log(`[verbose] updated hack SELF to "${slug}"`);
            }
          } catch (err) {
            if (verbose) console.log(`[verbose] could not update hack SELF: ${err.message}`);
          }
        }

        // 3. install deps
        const bunPath = which('bun');
        const npmPath = which('npm');
        const installer = bunPath || npmPath;
        if (!installer) {
          console.error('error: neither bun nor npm found. install one and retry.');
          process.exitCode = 1;
          return;
        }
        const cmd = bunPath ? 'bun' : 'npm';
        console.log(`${mark} installing deps with ${cmd}...`);
        execFileSync(installer, ['install'], {
          cwd: dirPath,
          encoding: 'utf-8',
          stdio: verbose ? 'inherit' : ['pipe', 'pipe', 'pipe'],
        });
        console.log(`${mark} deps installed`);

        // 4. link — run the link command from the cloned repo
        const vitBin = join(dirPath, 'bin', 'vit.js');
        const runtime = bunPath || 'node';
        if (verbose) console.log(`[verbose] running ${runtime} ${vitBin} link`);
        execFileSync(runtime, [vitBin, 'link'], {
          cwd: dirPath,
          encoding: 'utf-8',
          stdio: 'inherit',
        });

        console.log('');
        console.log(`you're now running ${name} from source.`);
        console.log(`your repo is at ${dirPath}`);
        console.log('');
        console.log('next:');
        console.log(`  cd ${dirName}`);
        console.log(`  ${name} setup`);
        console.log(`  ${name} login <your-handle>`);
        console.log(`  ${name} init`);
        console.log('');
        console.log('hack on vit, ship caps, and push upstream.');
      } catch (err) {
        console.error(err instanceof Error ? err.message : String(err));
        process.exitCode = 1;
      }
    });
}
