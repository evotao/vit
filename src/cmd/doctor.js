// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 sol pbc

import { loadConfig } from '../lib/config.js';
import { restoreAgent } from '../lib/oauth.js';
import { readProjectConfig } from '../lib/vit-dir.js';
import { existsSync, lstatSync, readlinkSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { which } from '../lib/compat.js';
import { mark, name } from '../lib/brand.js';

export default function register(program) {
  async function checkHealth() {
    try {
      const config = loadConfig();
      if (config.setup_at) {
        const when = new Date(config.setup_at * 1000).toISOString();
        console.log(`${mark} setup: ok (${when})`);
      } else {
        console.log(`${mark} setup: not done (run ${name} setup)`);
      }

      // check if vit is running from source
      const vitPath = which('vit');
      if (vitPath) {
        try {
          const stat = lstatSync(vitPath);
          if (stat.isSymbolicLink()) {
            const target = readlinkSync(vitPath);
            const repoDir = resolve(dirname(vitPath), dirname(target), '..');
            const isGit = existsSync(join(repoDir, '.git'));
            if (isGit) {
              console.log(`${mark} install: source (${repoDir})`);
            } else {
              console.log(`${mark} install: linked (${target})`);
            }
          } else {
            console.log(`${mark} install: global (${vitPath})`);
          }
        } catch {
          console.log(`${mark} install: ${vitPath}`);
        }
      } else {
        console.log(`${mark} install: not on PATH`);
      }

      const projConfig = readProjectConfig();
      if (projConfig.beacon) {
        console.log(`${mark} beacon: ${projConfig.beacon}`);
      } else {
        console.log(`${mark} beacon: not set`);
      }
      if (Array.isArray(projConfig.beacons) && projConfig.beacons.length > 0) {
        for (const b of projConfig.beacons) {
          console.log(`${mark} beacon: ${b} (collection)`);
        }
      }

      const skillPath = join(process.cwd(), '.claude', 'skills', 'using-vit', 'SKILL.md');
      if (existsSync(skillPath)) {
        console.log(`${mark} skill: ok (using-vit)`);
      } else {
        console.log(`${mark} skill: not installed (run ${name} setup)`);
      }

      if (!config.did) {
        console.log(`${mark} bluesky: not logged in (run ${name} login <handle>)`);
      } else {
        try {
          const { session } = await restoreAgent(config.did);
          const pds = session.serverMetadata?.issuer;
          console.log(`${mark} bluesky: ok (${session.did}${pds ? ', ' + pds : ''})`);
        } catch {
          console.log(`${mark} bluesky: token expired or invalid (run ${name} login <handle>)`);
        }
      }
    } catch (err) {
      console.error(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  }

  program.command('doctor')
    .description('Verify vit environment and project configuration')
    .action(checkHealth);
  program.command('status')
    .description('Alias for doctor')
    .action(checkHealth);
}
