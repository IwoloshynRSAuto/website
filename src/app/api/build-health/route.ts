import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

const MIN_CHUNK_JS = 40

function countJsFiles(dir: string): number {
  let n = 0
  function walk(d: string) {
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, ent.name)
      if (ent.isDirectory()) walk(p)
      else if (ent.name.endsWith('.js')) n++
    }
  }
  walk(dir)
  return n
}

function collectManifestJsPaths(buildManifest: Record<string, unknown>): string[] {
  const keys = ['polyfillFiles', 'rootMainFiles', 'lowPriorityFiles'] as const
  const out: string[] = []
  for (const k of keys) {
    const arr = buildManifest[k]
    if (Array.isArray(arr)) {
      for (const p of arr) {
        if (typeof p === 'string' && (p.endsWith('.js') || p.endsWith('.css'))) out.push(p)
      }
    }
  }
  return out
}

/**
 * Diagnose incomplete `.next/static` deployments (ChunkLoadError / application error).
 * Safe to expose internally; does not include secrets.
 */
export async function GET() {
  const root = process.cwd()
  const nextDir = path.join(root, '.next')
  const missing: string[] = []
  const checked: string[] = []

  if (!fs.existsSync(nextDir)) {
    return NextResponse.json(
      { ok: false, cwd: root, error: 'missing .next directory — build not run here' },
      { status: 503 }
    )
  }

  const bmPath = path.join(nextDir, 'build-manifest.json')
  if (!fs.existsSync(bmPath)) {
    return NextResponse.json(
      { ok: false, cwd: root, error: 'missing .next/build-manifest.json' },
      { status: 503 }
    )
  }

  let buildManifest: Record<string, unknown>
  try {
    buildManifest = JSON.parse(fs.readFileSync(bmPath, 'utf8')) as Record<string, unknown>
  } catch {
    return NextResponse.json(
      { ok: false, cwd: root, error: 'invalid .next/build-manifest.json' },
      { status: 503 }
    )
  }

  for (const rel of collectManifestJsPaths(buildManifest)) {
    checked.push(rel)
    const abs = path.join(nextDir, rel)
    if (!fs.existsSync(abs)) missing.push(rel)
  }

  const appChunkDir = path.join(nextDir, 'static', 'chunks', 'app')
  let layoutChunk: string | null = null
  if (!fs.existsSync(appChunkDir)) {
    missing.push('static/chunks/app (directory)')
  } else {
    const layouts = fs.readdirSync(appChunkDir).filter((f) => /^layout-[a-f0-9]+\.js$/.test(f))
    if (layouts.length !== 1) {
      missing.push(
        `static/chunks/app/layout-*.js (expected 1 file, found ${layouts.length}: ${layouts.join(', ') || 'none'})`
      )
    } else {
      layoutChunk = layouts[0]
      checked.push(`static/chunks/app/${layoutChunk}`)
    }
  }

  let buildId = ''
  try {
    buildId = fs.readFileSync(path.join(nextDir, 'BUILD_ID'), 'utf8').trim()
  } catch {
    buildId = '(unreadable)'
  }

  const chunksRoot = path.join(nextDir, 'static', 'chunks')
  let chunkJsCount = 0
  if (fs.existsSync(chunksRoot)) {
    chunkJsCount = countJsFiles(chunksRoot)
  }
  if (chunkJsCount < MIN_CHUNK_JS) {
    missing.push(
      `static/chunks: expected at least ${MIN_CHUNK_JS} .js files (found ${chunkJsCount}); partial deploy?`
    )
  }

  const ok = missing.length === 0

  return NextResponse.json(
    {
      ok,
      cwd: root,
      buildId,
      chunkJsCount,
      minChunkJsExpected: MIN_CHUNK_JS,
      checkedCount: checked.length,
      missing,
    },
    { status: ok ? 200 : 503 }
  )
}
