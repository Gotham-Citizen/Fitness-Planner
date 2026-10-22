// scripts/download-assets.mjs
import { mkdir, stat, writeFile } from 'node:fs/promises'
import { dirname, resolve, relative, isAbsolute } from 'node:path'
import { fileURLToPath } from 'node:url'

// ---------- 路径常量 ----------
const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const PUBLIC = resolve(ROOT, 'public')

// ---------- 数据源与下载配置 ----------
const BASE_URL = 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/'
const DATA_URL = `${BASE_URL}data/exercises.json`
const CONCURRENCY = 16
const RETRIES = 3
const TIMEOUT_MS = 30_000

// ---------- 工具：判断文件是否存在 ----------
async function exists(path) {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

// ---------- 工具：校验相对路径安全 ----------
function isSafeRelativePath(rel) {
  if (typeof rel !== 'string' || rel.length === 0) return false
  if (isAbsolute(rel)) return false
  const resolved = resolve(PUBLIC, rel)
  const relToPublic = relative(PUBLIC, resolved)
  return !relToPublic.startsWith('..') && !isAbsolute(relToPublic)
}

// ---------- 工具：带超时的 fetch ----------
async function fetchWithTimeout(url) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    return await fetch(url, { signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

// ---------- 核心：下载单个文件（带重试 + 超时） ----------
async function downloadFile(url, filePath, retries = RETRIES) {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const res = await fetchWithTimeout(url)
      if (!res.ok) {
        const err = new Error(`HTTP ${res.status}`)
        err.retryable = res.status >= 500 || res.status === 429
        throw err
      }
      const buf = Buffer.from(await res.arrayBuffer())
      await mkdir(dirname(filePath), { recursive: true })
      await writeFile(filePath, buf)
      return buf.length
    } catch (err) {
      const retryable = err.retryable !== false
      if (attempt === retries || !retryable) throw err
      await new Promise((r) => setTimeout(r, 500 * attempt))
    }
  }
}

// ---------- 并发池 ----------
async function runPool(items, worker, label = '') {
  let index = 0
  let ok = 0
  let skipped = 0
  const failures = []
  const total = items.length

  function renderProgress() {
    process.stdout.write(
      `\r${label}Progress: ${ok + skipped + failures.length}/${total} ` +
        `(ok: ${ok}, skipped: ${skipped}, failed: ${failures.length})   `,
    )
  }

  async function next() {
    while (index < total) {
      const i = index
      index += 1
      const item = items[i]
      try {
        const result = await worker(item)
        if (result === 'skipped') skipped += 1
        else ok += 1
      } catch (err) {
        failures.push({ item, error: err.message })
      }
      renderProgress()
    }
  }

  const workers = new Array(Math.min(CONCURRENCY, total)).fill(null)
  await Promise.all(workers.map(() => next()))
  process.stdout.write('\n')
  return { ok, skipped, failures }
}

// ---------- 工具：去重 + 过滤空值 ----------
function normalizeList(list) {
  const seen = new Set()
  const result = []
  for (const item of list) {
    if (!item || typeof item !== 'string') continue
    if (seen.has(item)) continue
    seen.add(item)
    result.push(item)
  }
  return result
}

// ---------- 主流程 ----------
async function main() {
  // 1. 拉取数据集
  console.log('Fetching exercises.json...')
  const dataRes = await fetchWithTimeout(DATA_URL)
  if (!dataRes.ok) throw new Error(`Failed to fetch dataset: HTTP ${dataRes.status}`)
  const text = await dataRes.text()
  const exercises = JSON.parse(text)
  console.log(`Dataset loaded: ${exercises.length} exercises`)

  // 2. 保存数据集到 server/data
  const dataPath = resolve(ROOT, 'server', 'data', 'exercises.json')
  await mkdir(dirname(dataPath), { recursive: true })
  await writeFile(dataPath, text)
  console.log(`Saved ${dataPath} (${(text.length / 1024 / 1024).toFixed(1)} MB)`)

  // 3. 收集并规范化 GIF / 缩略图路径
  const gifItems = normalizeList(exercises.map((e) => e.gif_url))
  const imageItems = normalizeList(exercises.map((e) => e.image))

  // 4. 下载 GIF
  console.log(`Downloading ${gifItems.length} GIFs...`)
  const gifResult = await runPool(
    gifItems,
    async (rel) => {
      if (!isSafeRelativePath(rel)) throw new Error('Unsafe path')
      const dest = resolve(PUBLIC, rel)
      if (await exists(dest)) return 'skipped'
      await downloadFile(BASE_URL + rel, dest)
      return 'ok'
    },
    'GIFs ',
  )

  // 5. 下载缩略图
  console.log(`Downloading ${imageItems.length} thumbnails...`)
  const imageResult = await runPool(
    imageItems,
    async (rel) => {
      if (!isSafeRelativePath(rel)) throw new Error('Unsafe path')
      const dest = resolve(PUBLIC, rel)
      if (await exists(dest)) return 'skipped'
      await downloadFile(BASE_URL + rel, dest)
      return 'ok'
    },
    'Images ',
  )

  // 6. 汇总
  console.log('\n=== SUMMARY ===')
  console.log(`GIFs:   ${gifResult.ok} ok, ${gifResult.skipped} skipped, ${gifResult.failures.length} failed`)
  console.log(`Images: ${imageResult.ok} ok, ${imageResult.skipped} skipped, ${imageResult.failures.length} failed`)

  const allFailures = [...gifResult.failures, ...imageResult.failures]
  for (const f of allFailures) {
    console.log('  FAILED:', f.item, '->', f.error)
  }

  // 7. 失败写日志
  if (allFailures.length) {
    const logPath = resolve(ROOT, 'download-failures.json')
    await writeFile(logPath, JSON.stringify(allFailures, null, 2))
    console.log(`\nFailure log written to ${logPath}`)
    process.exitCode = 1
  }
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})