import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { promises as fs } from 'node:fs'

const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'fgc-upperroom-api-'))
const dataDir = path.join(tempRoot, 'data')
const distDir = path.join(tempRoot, 'dist')

await fs.mkdir(path.join(distDir, 'assets'), { recursive: true })
await fs.mkdir(dataDir, { recursive: true })

await fs.writeFile(path.join(distDir, 'index.html'), '<!doctype html><html><body>prod-index</body></html>', 'utf8')
await fs.writeFile(path.join(distDir, 'assets', 'app.js'), 'console.log("prod asset");', 'utf8')

await fs.writeFile(path.join(dataDir, 'admin-blog-posts.json'), JSON.stringify([
  {
    id: 'published-post',
    title: 'Published Post',
    content: 'Visible in public blog.',
    category: 'article',
    author: 'Admin Team',
    excerpt: 'Published excerpt',
    status: 'published',
    image: '/assets/media/pictures/Senior Pastor_Home.jpeg',
    createdAt: '2026-03-27T10:00:00.000Z',
    updatedAt: '2026-03-27T10:00:00.000Z',
    publishedAt: '2026-03-27T10:00:00.000Z'
  },
  {
    id: 'draft-post',
    title: 'Draft Post',
    content: 'Should stay private.',
    category: 'article',
    author: 'Admin Team',
    excerpt: 'Draft excerpt',
    status: 'draft',
    createdAt: '2026-03-27T11:00:00.000Z',
    updatedAt: '2026-03-27T11:00:00.000Z'
  }
], null, 2), 'utf8')

await fs.writeFile(path.join(dataDir, 'admin-media.json'), JSON.stringify([
  {
    id: 'media-public-sermon',
    title: 'Sunday Sermon',
    description: 'Published sermon',
    category: 'sermons',
    mediaCategory: 'sermons',
    type: 'video',
    speaker: 'Pastor Dee',
    thumbnail: '/uploads/media/sermon-thumb.png',
    src: 'https://www.youtube.com/watch?v=abc123xyz99',
    videoUrl: 'https://www.youtube.com/watch?v=abc123xyz99',
    media: [
      {
        id: 'asset-sermon-1',
        type: 'video',
        src: 'https://www.youtube.com/watch?v=abc123xyz99',
        videoUrl: 'https://www.youtube.com/watch?v=abc123xyz99',
        thumbnail: '/uploads/media/sermon-thumb.png',
        alt: 'Sunday Sermon'
      }
    ],
    status: 'published',
    createdAt: '2026-03-27T09:00:00.000Z',
    updatedAt: '2026-03-27T09:00:00.000Z',
    publishedAt: '2026-03-27T09:00:00.000Z',
    timestamp: Date.parse('2026-03-27T09:00:00.000Z')
  },
  {
    id: 'media-private',
    title: 'Pending Media',
    description: 'Should stay private',
    category: 'youth',
    mediaCategory: 'youth',
    type: 'image',
    thumbnail: '/uploads/media/private-thumb.png',
    src: '/uploads/media/private-thumb.png',
    media: [],
    status: 'pending_review',
    createdAt: '2026-03-27T08:00:00.000Z',
    updatedAt: '2026-03-27T08:00:00.000Z',
    timestamp: Date.parse('2026-03-27T08:00:00.000Z')
  }
], null, 2), 'utf8')

await fs.writeFile(path.join(dataDir, 'giving-transactions.json'), JSON.stringify([
  {
    id: 'giving-1',
    reference: 'URG-TEST-1',
    provider: 'paystack',
    status: 'success',
    amountKobo: 500000,
    currency: 'NGN',
    fund: 'general',
    donorName: 'Ada Obi',
    donorEmail: 'ada@example.com',
    donorPhone: '+2348012345678',
    message: '',
    source: 'website',
    providerStatus: 'success',
    providerMessage: 'Payment complete.',
    initializedAt: '2026-03-27T07:00:00.000Z',
    updatedAt: '2026-03-27T07:05:00.000Z',
    paidAt: '2026-03-27T07:05:00.000Z',
    timeline: [],
    metadata: {}
  }
], null, 2), 'utf8')

await fs.writeFile(path.join(dataDir, 'admin-audit-log.json'), '[]', 'utf8')
await fs.writeFile(path.join(dataDir, 'admin-sessions.json'), '[]', 'utf8')
await fs.writeFile(path.join(dataDir, 'admin-testimonies.json'), JSON.stringify([
  {
    id: 'testimony-1',
    name: 'Sis. Favour C.',
    role: 'Member',
    quote: 'God gave me peace and direction during a difficult season through the prayers and teachings in Upper Room.',
    createdAt: '2026-03-05T09:30:00.000Z',
    updatedAt: null
  }
], null, 2), 'utf8')
await fs.writeFile(path.join(dataDir, 'newsletter-subscribers.json'), '[]', 'utf8')
await fs.writeFile(path.join(dataDir, 'event-email-sync-log.json'), '[]', 'utf8')
await fs.writeFile(path.join(dataDir, 'contact-submissions.json'), '[]', 'utf8')
await fs.writeFile(path.join(dataDir, 'rum-events.json'), '[]', 'utf8')

process.env.APP_DATA_DIR = dataDir
process.env.APP_DIST_DIR = distDir
process.env.APP_BASE_PATH = '/fgc-testing/'
process.env.GIVING_USE_JSON_STORE = 'true'
process.env.ADMIN_DEFAULT_EMAIL = 'admin@upperroom.local'
process.env.ADMIN_DEFAULT_PASSWORD = 'ChangeMe1234'
process.env.PAYSTACK_SECRET_KEY = ''
process.env.PAYSTACK_PUBLIC_KEY = 'pk_test_fake'
process.env.GIVING_ENABLE_CRYPTO = 'true'
process.env.GIVING_BANK_ACCOUNTS_JSON = JSON.stringify([
  {
    id: 'zenith-main',
    bankName: 'Upper Room Test Bank',
    accountName: 'FGC Upper Room',
    accountNumber: '0123456789',
    instructions: 'Use the generated reference as your transfer narration.',
    details: [
      { label: 'Branch', value: 'Mgbuoba' }
    ]
  },
  {
    id: 'gtbank-alt',
    bankName: 'Overflow Test Bank',
    accountName: 'FGC Upper Room',
    accountNumber: '9876543210',
    instructions: 'Use the generated reference as your transfer narration.',
    details: [
      { label: 'Branch', value: 'Port Harcourt' },
      { label: 'Sort Code', value: '058152036' }
    ]
  }
])

const { createApp } = await import(`../server.ts?api-routing-test=${Date.now()}`)

let apiServer
let apiBaseUrl
let prodServer
let prodBaseUrl
let cryptoRpcServer
let cryptoRpcBaseUrl
const cryptoWalletAddress = '0x1111111111111111111111111111111111111111'
const burnedTxHash = `0x${'a'.repeat(64)}`

const startHttpServer = async (app) => {
  return new Promise((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const address = server.address()
      resolve({
        server,
        baseUrl: `http://127.0.0.1:${address.port}`
      })
    })
  })
}

const stopHttpServer = async (server) => {
  if (!server) return

  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error)
        return
      }

      resolve()
    })
  })
}

const request = async (baseUrl, resource, options = {}) => {
  const { json, headers = {}, ...rest } = options
  const response = await fetch(`${baseUrl}${resource}`, {
    ...rest,
    headers: {
      ...(json ? { 'Content-Type': 'application/json' } : {}),
      ...headers
    },
    body: json ? JSON.stringify(json) : rest.body
  })

  const text = await response.text()
  let data = null

  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = null
  }

  return { response, status: response.status, text, data }
}

const loginAsSeedAdmin = async () => {
  const login = await request(apiBaseUrl, '/api/admin/auth/login', {
    method: 'POST',
    json: {
      email: 'admin@upperroom.local',
      password: 'ChangeMe1234'
    }
  })

  assert.equal(login.status, 200)
  assert.ok(login.data?.token)
  return login.data.token
}

before(async () => {
  cryptoRpcServer = http.createServer((req, res) => {
    const chunks = []

    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => {
      let body = {}
      try {
        body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
      } catch {
        body = {}
      }

      if (String(body?.method || '') === 'eth_getTransactionByHash') {
        const [hash] = Array.isArray(body?.params) ? body.params : []
        const responseBody = {
          jsonrpc: '2.0',
          id: body?.id ?? 1,
          result: {
            hash,
            to: cryptoWalletAddress,
            from: '0x2222222222222222222222222222222222222222',
            input: '0x',
            value: '0x0'
          }
        }

        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify(responseBody))
        return
      }

      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ jsonrpc: '2.0', id: body?.id ?? 1, result: null }))
    })
  })

  await new Promise((resolve) => {
    cryptoRpcServer.listen(0, '127.0.0.1', () => {
      const address = cryptoRpcServer.address()
      if (!address || typeof address === 'string') {
        throw new Error('Crypto RPC server address unavailable')
      }
      cryptoRpcBaseUrl = `http://127.0.0.1:${address.port}`
      resolve()
    })
  })

  process.env.GIVING_CRYPTO_WALLET_ADDRESS = cryptoWalletAddress
  process.env.GIVING_CRYPTO_RPC_URL = cryptoRpcBaseUrl

  const apiApp = await createApp({ apiOnly: true, isProd: false })
  const prodApp = await createApp({ apiOnly: false, isProd: true })

  ;({ server: apiServer, baseUrl: apiBaseUrl } = await startHttpServer(apiApp))
  ;({ server: prodServer, baseUrl: prodBaseUrl } = await startHttpServer(prodApp))
})

after(async () => {
  await Promise.all([
    stopHttpServer(apiServer),
    stopHttpServer(prodServer),
    stopHttpServer(cryptoRpcServer)
  ])
  await fs.rm(tempRoot, { recursive: true, force: true })
})

test('public website routes expose expected data contracts', async () => {
  const blog = await request(apiBaseUrl, '/api/blog')
  assert.equal(blog.status, 200)
  assert.ok(Array.isArray(blog.data?.data))
  assert.deepEqual(blog.data.data.map((entry) => entry.title), ['Published Post'])

  const media = await request(apiBaseUrl, '/api/media')
  assert.equal(media.status, 200)
  assert.ok(Array.isArray(media.data?.data))
  assert.deepEqual(media.data.data.map((entry) => entry.id), ['media-public-sermon'])

  const sermons = await request(apiBaseUrl, '/api/sermons')
  assert.equal(sermons.status, 200)
  assert.ok(Array.isArray(sermons.data?.data))
  assert.equal(sermons.data.data[0].title, 'Sunday Sermon')

  const testimonies = await request(apiBaseUrl, '/api/testimonies')
  assert.equal(testimonies.status, 200)
  assert.ok(Array.isArray(testimonies.data?.data))
  assert.equal(testimonies.data.data[0].id, 'testimony-1')

  const vod = await request(apiBaseUrl, '/api/vod?limit=1')
  assert.equal(vod.status, 200)
  assert.equal(vod.data?.data?.length, 1)

  const givingConfig = await request(apiBaseUrl, '/api/giving/config')
  assert.equal(givingConfig.status, 200)
  assert.equal(givingConfig.data?.ok, true)
  assert.equal(givingConfig.data?.bankTransferEnabled, true)
  assert.equal(typeof givingConfig.data?.accountNumber, 'string')
  assert.ok(givingConfig.data.accountNumber.length > 0)
  assert.equal(givingConfig.data?.bankAccounts?.length, 2)
  assert.equal(typeof givingConfig.data?.bankAccounts?.[1]?.bankName, 'string')
  assert.ok(givingConfig.data.bankAccounts[1].bankName.length > 0)

  const bankTransfer = await request(apiBaseUrl, '/api/giving/initialize', {
    method: 'POST',
    json: {
      donorName: 'Bank Transfer Donor',
      donorEmail: 'bank@example.com',
      donorPhone: '+2348011111111',
      fund: 'sunday-offering',
      amount: 3000,
      provider: 'bank_transfer',
      bankAccountId: 'gtbank-alt'
    }
  })
  assert.equal(bankTransfer.status, 200)
  assert.ok(bankTransfer.data?.reference)
  assert.equal(bankTransfer.data?.bankAccountId, 'gtbank-alt')
  assert.equal(typeof bankTransfer.data?.bankName, 'string')
  assert.ok(bankTransfer.data.bankName.length > 0)
  assert.equal(typeof bankTransfer.data?.accountName, 'string')
  assert.ok(bankTransfer.data.accountName.length > 0)
  assert.equal(typeof bankTransfer.data?.accountNumber, 'string')
  assert.ok(bankTransfer.data.accountNumber.length > 0)
  assert.ok(Array.isArray(bankTransfer.data?.details))
  assert.ok((bankTransfer.data?.details?.length || 0) > 0)

  const bankTransferConfirm = await request(apiBaseUrl, `/api/giving/confirm?reference=${encodeURIComponent(bankTransfer.data.reference)}`)
  assert.equal(bankTransferConfirm.status, 200)
  assert.equal(bankTransferConfirm.data?.data?.provider, 'bank_transfer')
  assert.equal(bankTransferConfirm.data?.data?.status, 'pending')

  const givingConfirm = await request(apiBaseUrl, '/api/giving/confirm?reference=URG-TEST-1')
  assert.equal(givingConfirm.status, 200)
  assert.equal(givingConfirm.data?.data?.reference, 'URG-TEST-1')
})

test('newsletter subscribe is public and admin list is protected', async () => {
  const subscribe = await request(apiBaseUrl, '/api/newsletter/subscribe', {
    method: 'POST',
    json: {
      name: 'Chioma',
      email: 'chioma@example.com',
      source: 'footer-newsletter'
    }
  })

  assert.equal(subscribe.status, 200)
  assert.equal(subscribe.data?.ok, true)
  assert.equal(subscribe.data?.data?.email, 'chioma@example.com')

  const protectedSubscribers = await request(apiBaseUrl, '/api/newsletter/subscribers')
  assert.equal(protectedSubscribers.status, 401)

  const token = await loginAsSeedAdmin()
  const subscribers = await request(apiBaseUrl, '/api/newsletter/subscribers', {
    headers: { Authorization: `Bearer ${token}` }
  })

  assert.equal(subscribers.status, 200)
  assert.ok(Array.isArray(subscribers.data?.data))
  assert.equal(subscribers.data.data.length, 1)
})

test('crypto giving rejects reused transaction hashes and records the duplicate as failed', async () => {
  const firstInit = await request(apiBaseUrl, '/api/giving/initialize', {
    method: 'POST',
    json: {
      donorName: 'Crypto Donor One',
      donorEmail: 'crypto.one@example.com',
      donorPhone: '+2348011111111',
      fund: 'general',
      amount: 10,
      provider: 'crypto'
    }
  })

  assert.equal(firstInit.status, 200)
  assert.ok(firstInit.data?.reference)

  const firstVerify = await request(apiBaseUrl, '/api/giving/verify-crypto', {
    method: 'POST',
    json: {
      reference: firstInit.data.reference,
      txHash: burnedTxHash
    }
  })

  assert.equal(firstVerify.status, 200)
  assert.equal(firstVerify.data?.data?.status, 'success')

  const secondInit = await request(apiBaseUrl, '/api/giving/initialize', {
    method: 'POST',
    json: {
      donorName: 'Crypto Donor Two',
      donorEmail: 'crypto.two@example.com',
      donorPhone: '+2348022222222',
      fund: 'welfare',
      amount: 10,
      provider: 'crypto'
    }
  })

  assert.equal(secondInit.status, 200)
  assert.ok(secondInit.data?.reference)

  const secondVerify = await request(apiBaseUrl, '/api/giving/verify-crypto', {
    method: 'POST',
    json: {
      reference: secondInit.data.reference,
      txHash: burnedTxHash
    }
  })

  assert.equal(secondVerify.status, 409)
  assert.match(String(secondVerify.data?.error || ''), /already been used/i)
  assert.equal(secondVerify.data?.duplicateOfReference, firstInit.data.reference)
  assert.equal(secondVerify.data?.data?.status, 'failed')
  assert.equal(secondVerify.data?.data?.providerStatus, 'duplicate_tx_hash')

  const token = await loginAsSeedAdmin()
  const adminGiving = await request(apiBaseUrl, `/api/admin/giving?q=${encodeURIComponent(String(secondInit.data.reference))}`, {
    headers: { Authorization: `Bearer ${token}` }
  })

  assert.equal(adminGiving.status, 200)
  assert.ok(Array.isArray(adminGiving.data?.data))

  const duplicateRecord = adminGiving.data.data.find((item) => item.reference === secondInit.data.reference)
  assert.ok(duplicateRecord)
  assert.equal(duplicateRecord.status, 'failed')
  assert.equal(duplicateRecord.providerStatus, 'duplicate_tx_hash')
})

test('admin routes are mounted and use frontend-compatible response envelopes', async () => {
  const protectedMedia = await request(apiBaseUrl, '/api/admin/media')
  assert.equal(protectedMedia.status, 401)

  const token = await loginAsSeedAdmin()

  const users = await request(apiBaseUrl, '/api/admin/users', {
    headers: { Authorization: `Bearer ${token}` }
  })
  assert.equal(users.status, 200)
  assert.ok(Array.isArray(users.data?.users))

  const auditLog = await request(apiBaseUrl, '/api/admin/audit-log', {
    headers: { Authorization: `Bearer ${token}` }
  })
  assert.equal(auditLog.status, 200)
  assert.ok(Array.isArray(auditLog.data?.records))

  const giving = await request(apiBaseUrl, '/api/admin/giving', {
    headers: { Authorization: `Bearer ${token}` }
  })
  assert.equal(giving.status, 200)
  assert.ok(Array.isArray(giving.data?.data))
  assert.ok(Number(giving.data?.total) >= 1)

  const givingDetail = await request(apiBaseUrl, '/api/admin/giving/URG-TEST-1', {
    headers: { Authorization: `Bearer ${token}` }
  })
  assert.equal(givingDetail.status, 200)
  assert.equal(givingDetail.data?.data?.reference, 'URG-TEST-1')

  const adminBlog = await request(apiBaseUrl, '/api/admin/blog', {
    headers: { Authorization: `Bearer ${token}` }
  })
  assert.equal(adminBlog.status, 200)
  assert.ok(Array.isArray(adminBlog.data?.data))

  const adminTestimonies = await request(apiBaseUrl, '/api/admin/testimonies', {
    headers: { Authorization: `Bearer ${token}` }
  })
  assert.equal(adminTestimonies.status, 200)
  assert.ok(Array.isArray(adminTestimonies.data?.data))
  assert.equal(adminTestimonies.data.data[0].id, 'testimony-1')

  const updateTestimonies = await request(apiBaseUrl, '/api/admin/testimonies', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    json: {
      testimonies: [
        {
          id: 'testimony-2',
          name: 'Bro. Daniel A.',
          role: 'Choir Unit',
          quote: 'Shared testimony from the admin API.',
          createdAt: '2026-03-28T10:00:00.000Z',
          updatedAt: null
        }
      ]
    }
  })
  assert.equal(updateTestimonies.status, 200)
  assert.equal(updateTestimonies.data?.count, 1)

  const updatedPublicTestimonies = await request(apiBaseUrl, '/api/testimonies')
  assert.equal(updatedPublicTestimonies.status, 200)
  assert.equal(updatedPublicTestimonies.data?.data?.[0]?.id, 'testimony-2')

  const reviewerCreate = await request(apiBaseUrl, '/api/admin/users', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    json: {
      email: 'reviewer@upperroom.local',
      name: 'Media Reviewer',
      role: 'reviewer',
      password: 'Review1234'
    }
  })
  assert.equal(reviewerCreate.status, 201)

  const reviewerLogin = await request(apiBaseUrl, '/api/admin/auth/login', {
    method: 'POST',
    json: {
      email: 'reviewer@upperroom.local',
      password: 'Review1234'
    }
  })
  assert.equal(reviewerLogin.status, 200)
  assert.ok(reviewerLogin.data?.token)
  const reviewerToken = reviewerLogin.data.token

  const reviewerMedia = await request(apiBaseUrl, '/api/admin/media', {
    headers: { Authorization: `Bearer ${reviewerToken}` }
  })
  assert.equal(reviewerMedia.status, 200)
  assert.ok(Array.isArray(reviewerMedia.data?.data))

  const reviewerPut = await request(apiBaseUrl, '/api/admin/media', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${reviewerToken}` },
    json: {
      items: []
    }
  })
  assert.equal(reviewerPut.status, 403)

  const reviewerApprove = await request(apiBaseUrl, '/api/admin/media/media-private/approve', {
    method: 'POST',
    headers: { Authorization: `Bearer ${reviewerToken}` }
  })
  assert.equal(reviewerApprove.status, 200)
  assert.equal(reviewerApprove.data?.data?.status, 'published')
})

test('production static serving and SPA fallback do not swallow API routes', async () => {
  const rootRedirect = await request(prodBaseUrl, '/', {
    redirect: 'manual',
    headers: { Accept: 'text/html' }
  })
  assert.equal(rootRedirect.status, 302)
  assert.equal(rootRedirect.response.headers.get('location'), '/fgc-testing/')

  const baseIndex = await request(prodBaseUrl, '/fgc-testing/', {
    headers: { Accept: 'text/html' }
  })
  assert.equal(baseIndex.status, 200)
  assert.match(baseIndex.text, /prod-index/)

  const asset = await request(prodBaseUrl, '/fgc-testing/assets/app.js', {
    headers: { Accept: 'text/javascript' }
  })
  assert.equal(asset.status, 200)
  assert.match(asset.text, /prod asset/)

  const spaPage = await request(prodBaseUrl, '/fgc-testing/blog', {
    headers: { Accept: 'text/html' }
  })
  assert.equal(spaPage.status, 200)
  assert.match(spaPage.text, /prod-index/)

  const apiBlog = await request(prodBaseUrl, '/api/blog')
  assert.equal(apiBlog.status, 200)
  assert.ok(Array.isArray(apiBlog.data?.data))

  const missingAsset = await request(prodBaseUrl, '/fgc-testing/missing.css', {
    headers: { Accept: 'text/css' }
  })
  assert.equal(missingAsset.status, 404)
})
