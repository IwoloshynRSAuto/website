#!/usr/bin/env node
/**
 * Fails if `.next/static` is incomplete (common cause of ChunkLoadError in prod).
 * Run after `npm run build` on the deploy host before restarting the process.
 */
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const nextDir = path.join(root, '.next')

function die(msg) {
  console.error(`verify-next-static: ${msg}`)
  process.exit(1)
}

if (!fs.existsSync(nextDir)) die('Missing .next — run npm run build first')

const bmPath = path.join(nextDir, 'build-manifest.json')
if (!fs.existsSync(bmPath)) die('Missing .next/build-manifest.json')

let bm
try {
  bm = JSON.parse(fs.readFileSync(bmPath, 'utf8'))
} catch {
  die('Could not parse .next/build-manifest.json')
}

function assertFile(relFromNext) {
  const abs = path.join(nextDir, relFromNext)
  if (!fs.existsSync(abs)) die(`Missing file referenced by build-manifest: ${relFromNext}`)
}

for (const key of ['polyfillFiles', 'rootMainFiles']) {
  for (const rel of bm[key] || []) {
    assertFile(rel)
  }
}

for (const rel of bm.lowPriorityFiles || []) {
  assertFile(rel)
}

const appChunkDir = path.join(nextDir, 'static', 'chunks', 'app')
if (!fs.existsSync(appChunkDir)) die('Missing .next/static/chunks/app')

const layouts = fs.readdirSync(appChunkDir).filter((f) => /^layout-[a-f0-9]+\.js$/.test(f))
if (layouts.length !== 1) {
  die(`Expected exactly one layout-[hash].js under static/chunks/app, found: ${layouts.join(', ') || '(none)'}`)
}

function countJsFiles(dir) {
  let n = 0
  function walk(d) {
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, ent.name)
      if (ent.isDirectory()) walk(p)
      else if (ent.name.endsWith('.js')) n++
    }
  }
  walk(dir)
  return n
}

const chunksRoot = path.join(nextDir, 'static', 'chunks')
const chunkJsCount = countJsFiles(chunksRoot)
const MIN_CHUNK_JS = 40
if (chunkJsCount < MIN_CHUNK_JS) {
  die(
    `Too few JS files under static/chunks (${chunkJsCount}); expected at least ${MIN_CHUNK_JS} — partial or corrupt .next/static`
  )
}

console.log(`verify-next-static: OK (layout ${layouts[0]}, ${chunkJsCount} chunk JS files)`)
