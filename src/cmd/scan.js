// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 sol pbc

import { CAP_COLLECTION } from '../lib/constants.js';
import { brand } from '../lib/brand.js';

const JETSTREAM_URL = 'wss://jetstream2.us-east.bsky.network/subscribe';

function resolveHandle(did) {
  return fetch(`https://plc.directory/${encodeURIComponent(did)}`)
    .then(r => r.ok ? r.json() : null)
    .then(doc => {
      const aka = doc?.alsoKnownAs?.find(a => a.startsWith('at://'));
      return aka ? aka.replace('at://', '') : null;
    })
    .catch(() => null);
}

export default function register(program) {
  program
    .command('scan')
    .description('Replay recent network activity and list cap publishers')
    .option('--days <n>', 'How many days to replay', '7')
    .option('--beacon <beacon>', 'Filter by beacon')
    .option('-v, --verbose', 'Show each event as it replays')
    .action(async (opts) => {
      try {
        const days = parseInt(opts.days, 10);
        if (isNaN(days) || days < 1) {
          console.error('error: --days must be a positive integer');
          process.exitCode = 1;
          return;
        }

        const cursorUs = (Date.now() - days * 86400 * 1000) * 1000;
        const url = new URL(JETSTREAM_URL);
        url.searchParams.set('wantedCollections', CAP_COLLECTION);
        url.searchParams.set('cursor', String(cursorUs));

        console.log(`${brand} scan`);
        console.log(`  Replaying ${days} day${days === 1 ? '' : 's'} of ${CAP_COLLECTION} events...`);
        if (opts.beacon) console.log(`  Beacon filter: ${opts.beacon}`);
        console.log('');

        const publishers = new Map(); // did -> { caps: count, beacons: Set, lastSeen: string }
        const nowUs = Date.now() * 1000;
        let eventCount = 0;

        // Jetstream replays all commits from the cursor, but org.v-it.cap events
        // are sparse among millions of other records, so gaps between our events
        // can be 30-60s during replay. Scale timeout by scan window.
        const replayTimeoutMs = Math.max(120000, Math.min(days * 60000, 300000));

        await new Promise((resolve, reject) => {
          const ws = new WebSocket(url.toString());
          let done = false;

          const progressInterval = opts.verbose ? null : setInterval(() => {
            process.stderr.write('.');
          }, 10000);

          ws.onopen = () => {
            if (opts.verbose) console.log(`[verbose] connected, replaying (${Math.round(replayTimeoutMs / 1000)}s timeout)...`);
          };

          ws.onmessage = (event) => {
            let msg;
            try {
              msg = JSON.parse(event.data);
            } catch {
              return;
            }

            if (msg.kind !== 'commit') return;
            const op = msg.commit?.operation;
            if (op !== 'create' && op !== 'update') return;

            const record = msg.commit?.record;
            if (!record) return;

            if (opts.beacon && record.beacon !== opts.beacon) return;

            eventCount++;
            const did = msg.did;
            const entry = publishers.get(did) || { caps: 0, beacons: new Set(), lastSeen: '' };
            entry.caps++;
            if (record.beacon) entry.beacons.add(record.beacon);
            const time = msg.time_us ? new Date(msg.time_us / 1000).toISOString() : '';
            if (time > entry.lastSeen) entry.lastSeen = time;
            publishers.set(did, entry);

            if (opts.verbose) {
              const title = record.title || record.ref || '';
              console.log(`  ${did.slice(-12)} ${record.beacon || '(no beacon)'} — ${title}`);
            }
          };

          ws.onerror = (err) => {
            reject(new Error(`WebSocket error: ${err?.message ?? 'unknown'}`));
          };

          ws.onclose = () => {
            if (progressInterval) clearInterval(progressInterval);
            if (!opts.verbose && eventCount > 0) process.stderr.write('\n');
            resolve();
          };

          setTimeout(() => {
            if (!done) {
              done = true;
              if (opts.verbose) console.log('[verbose] replay complete');
              ws.close();
            }
          }, replayTimeoutMs);
        });

        if (publishers.size === 0) {
          console.log('no cap publishers found in this period.');
          return;
        }

        // resolve handles in parallel
        const dids = [...publishers.keys()];
        const handles = await Promise.all(dids.map(d => resolveHandle(d)));

        // sort by cap count descending
        const sorted = dids
          .map((did, i) => ({ did, handle: handles[i], ...publishers.get(did) }))
          .sort((a, b) => b.caps - a.caps);

        console.log(`found ${sorted.length} publisher${sorted.length === 1 ? '' : 's'} (${eventCount} cap event${eventCount === 1 ? '' : 's'}):\n`);
        for (const p of sorted) {
          const who = p.handle || p.did;
          const beacons = [...p.beacons].join(', ') || '(no beacon)';
          console.log(`  ${who}`);
          console.log(`    caps: ${p.caps}  beacons: ${beacons}`);
          console.log(`    last active: ${p.lastSeen}`);
          console.log('');
        }
      } catch (err) {
        console.error(err instanceof Error ? err.message : String(err));
        process.exitCode = 1;
      }
    });
}
