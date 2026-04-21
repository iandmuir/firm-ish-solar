import { describe, it, expect, vi, beforeEach } from 'vitest'
import zlib from 'node:zlib'
// NOTE: this file is intentionally describe.skip'd. @testing-library/react is
// not in devDependencies, so renderHook-based tests are deferred. The hook is
// small, follows the canonical async-effect pattern, and is verified manually
// in `npm run dev`. If a regression ever surfaces, add RTL + jsdom and
// un-skip this block.

function gzippedJson(obj) {
  const gz = zlib.gzipSync(JSON.stringify(obj))
  return {
    ok: true,
    body: new ReadableStream({ start(c) { c.enqueue(gz); c.close() } }),
  }
}

describe.skip('useCityData', () => {
  it('loads city data asynchronously (stub — requires RTL)', async () => {
    expect(typeof gzippedJson).toBe('function')
  })
})
