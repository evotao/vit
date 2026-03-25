// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 sol pbc

/**
 * Resolve a DID to its PDS endpoint via plc.directory.
 * @param {string} did - e.g. "did:plc:abc123"
 * @returns {Promise<string>} PDS URL, e.g. "https://amanita.us-east.host.bsky.network"
 */
export async function resolvePds(did) {
  const res = await fetch(`https://plc.directory/${encodeURIComponent(did)}`);
  if (!res.ok) throw new Error(`failed to resolve DID ${did}: ${res.status}`);
  const doc = await res.json();
  const pds = doc.service?.find(s => s.id === '#atproto_pds');
  if (!pds) throw new Error(`no PDS service found for ${did}`);
  return pds.serviceEndpoint;
}

/**
 * Fetch records from a specific PDS using the public XRPC endpoint.
 * @param {string} pdsUrl - PDS base URL
 * @param {string} repo - DID of the repo owner
 * @param {string} collection - e.g. "org.v-it.cap"
 * @param {number} limit - max records to fetch
 * @returns {Promise<{records: Array}>}
 */
export async function listRecordsFromPds(pdsUrl, repo, collection, limit) {
  const url = new URL('/xrpc/com.atproto.repo.listRecords', pdsUrl);
  url.searchParams.set('repo', repo);
  url.searchParams.set('collection', collection);
  url.searchParams.set('limit', String(limit));
  const res = await fetch(url);
  if (!res.ok) throw new Error(`listRecords failed for ${repo}: ${res.status}`);
  return res.json();
}
