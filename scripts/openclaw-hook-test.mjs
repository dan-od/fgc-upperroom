import dotenv from 'dotenv'

dotenv.config()

const hookUrl = String(process.env.OPENCLAW_HOOK_URL || '').trim()
const hookToken = String(process.env.OPENCLAW_HOOK_TOKEN || '').trim()
const hookMode = String(process.env.OPENCLAW_HOOK_MODE || 'now').trim() || 'now'

if (!hookUrl || !hookToken) {
  console.log('[openclaw] SKIP: OPENCLAW_HOOK_URL or OPENCLAW_HOOK_TOKEN not set')
  process.exit(0)
}

const run = async () => {
  const parsed = new URL(hookUrl)
  console.log(
    `[openclaw] target=${parsed.protocol}//${parsed.hostname}:${parsed.port || (parsed.protocol === 'https:' ? '443' : '80')}${parsed.pathname}`
  )

  const response = await fetch(hookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${hookToken}`
    },
    body: JSON.stringify({
      text: `[FGC Test] OpenClaw hook test at ${new Date().toISOString()}`,
      mode: hookMode
    })
  })

  const body = await response.text().catch(() => '')
  if (!response.ok) {
    console.error(`[openclaw] FAIL: status=${response.status} body=${String(body).slice(0, 300)}`)
    process.exit(1)
  }

  console.log(`[openclaw] PASS: status=${response.status} body=${String(body).slice(0, 300)}`)
}

run().catch((error) => {
  const cause = error?.cause || {}
  const code = cause?.code || error?.code || ''
  const errno = cause?.errno || error?.errno || ''
  const syscall = cause?.syscall || error?.syscall || ''
  const address = cause?.address || error?.address || ''
  const port = cause?.port || error?.port || ''
  console.error(
    `[openclaw] FAIL: ${error?.message || error} code=${code} errno=${errno} syscall=${syscall} address=${address} port=${port}`
  )
  process.exit(1)
})
