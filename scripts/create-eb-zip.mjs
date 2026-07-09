/**
 * Creates an Elastic Beanstalk-compatible ZIP with forward-slash paths.
 * Windows Compress-Archive uses backslashes which Linux unzip rejects.
 * Run from the repo root: node scripts/create-eb-zip.mjs
 */

import { createWriteStream, readdirSync, statSync, readFileSync } from 'fs';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const repoRoot  = join(__dirname, '..');
const serverDir = join(repoRoot, 'server');
const outZip    = join(repoRoot, 'cyber-fit-backend.zip');

// Minimal ZIP implementation using only Node built-ins (no dependencies needed)
// We shell out to Node's child_process to run the zip via a cross-platform approach.
// Actually we'll use the archiver pattern with raw zip spec writing.

// ── Simpler approach: use the built-in zlib + manual ZIP format ──────────────
// Too complex without a library. Use a tiny inline zip writer instead.

import { execSync } from 'child_process';
import { existsSync, unlinkSync } from 'fs';

// Remove old ZIP
if (existsSync(outZip)) {
  unlinkSync(outZip);
  console.log('Removed old cyber-fit-backend.zip');
}

// Collect all files recursively, excluding node_modules and .env
const EXCLUDE = new Set([
  'node_modules', '.env', '.env.local', '.env.production',
  'npm-debug.log', '.DS_Store', 'vercel.json',
]);

function walk(dir, base = '') {
  const entries = [];
  for (const name of readdirSync(dir)) {
    if (EXCLUDE.has(name)) continue;
    const abs  = join(dir, name);
    const rel  = base ? `${base}/${name}` : name; // always forward slash
    const stat = statSync(abs);
    if (stat.isDirectory()) {
      entries.push(...walk(abs, rel));
    } else {
      entries.push({ abs, rel });
    }
  }
  return entries;
}

const files = walk(serverDir);
console.log(`Packing ${files.length} files...`);

// Write a ZIP using Node's built-in zlib for deflate
import zlib from 'zlib';

// ── Minimal ZIP writer ────────────────────────────────────────────────────────
const CRC32_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = CRC32_TABLE[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function writeUInt16LE(buf, val, off) { buf[off] = val & 0xFF; buf[off+1] = (val >> 8) & 0xFF; }
function writeUInt32LE(buf, val, off) {
  buf[off]   =  val        & 0xFF;
  buf[off+1] = (val >>  8) & 0xFF;
  buf[off+2] = (val >> 16) & 0xFF;
  buf[off+3] = (val >> 24) & 0xFF;
}

const parts   = [];
const central = [];
let   offset  = 0;

for (const { abs, rel } of files) {
  const data       = readFileSync(abs);
  const compressed = zlib.deflateRawSync(data, { level: 6 });
  const nameBytes  = Buffer.from(rel, 'utf8');
  const crc        = crc32(data);
  const now        = new Date();
  const dosTime    = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
  const dosDate    = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();

  // Local file header
  const lh = Buffer.alloc(30 + nameBytes.length);
  writeUInt32LE(lh, 0x04034B50, 0);   // signature
  writeUInt16LE(lh, 20,         4);   // version needed
  writeUInt16LE(lh, 0x0800,     6);   // flags (UTF-8)
  writeUInt16LE(lh, 8,          8);   // compression: deflate
  writeUInt16LE(lh, dosTime,   10);
  writeUInt16LE(lh, dosDate,   12);
  writeUInt32LE(lh, crc,       14);
  writeUInt32LE(lh, compressed.length,  18);
  writeUInt32LE(lh, data.length,        22);
  writeUInt16LE(lh, nameBytes.length,   26);
  writeUInt16LE(lh, 0,                  28); // extra length
  nameBytes.copy(lh, 30);

  parts.push(lh, compressed);

  // Central directory entry
  const cd = Buffer.alloc(46 + nameBytes.length);
  writeUInt32LE(cd, 0x02014B50, 0);   // signature
  writeUInt16LE(cd, 20,          4);  // version made by
  writeUInt16LE(cd, 20,          6);  // version needed
  writeUInt16LE(cd, 0x0800,      8);  // flags (UTF-8)
  writeUInt16LE(cd, 8,          10);  // deflate
  writeUInt16LE(cd, dosTime,    12);
  writeUInt16LE(cd, dosDate,    14);
  writeUInt32LE(cd, crc,        16);
  writeUInt32LE(cd, compressed.length, 20);
  writeUInt32LE(cd, data.length,       24);
  writeUInt16LE(cd, nameBytes.length,  28);
  writeUInt16LE(cd, 0,                 30); // extra
  writeUInt16LE(cd, 0,                 32); // comment
  writeUInt16LE(cd, 0,                 34); // disk start
  writeUInt16LE(cd, 0,                 36); // internal attr
  writeUInt32LE(cd, 0,                 38); // external attr
  writeUInt32LE(cd, offset,            42); // local header offset
  nameBytes.copy(cd, 46);
  central.push(cd);

  offset += lh.length + compressed.length;
}

// End of central directory
const cdBuf    = Buffer.concat(central);
const eocd     = Buffer.alloc(22);
writeUInt32LE(eocd, 0x06054B50,     0);
writeUInt16LE(eocd, 0,              4);  // disk
writeUInt16LE(eocd, 0,              6);  // disk with cd
writeUInt16LE(eocd, central.length, 8);
writeUInt16LE(eocd, central.length, 10);
writeUInt32LE(eocd, cdBuf.length,   12);
writeUInt32LE(eocd, offset,         16);
writeUInt16LE(eocd, 0,              20); // comment length

const allParts = [...parts, cdBuf, eocd];
const ws = createWriteStream(outZip);
for (const p of allParts) ws.write(p);
ws.end(() => {
  const kb = Math.round(allParts.reduce((s, b) => s + b.length, 0) / 1024);
  console.log(`✓ Created cyber-fit-backend.zip (${kb} KB) with forward-slash paths`);
  console.log(`  Location: ${outZip}`);
});
