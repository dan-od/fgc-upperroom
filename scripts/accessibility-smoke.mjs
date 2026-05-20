import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

const readText = async (relativePath) => {
  const fullPath = path.join(repoRoot, relativePath)
  return fs.readFile(fullPath, 'utf8')
}

const assertCheck = (condition, message, failures) => {
  if (!condition) {
    failures.push(message)
  }
}

const main = async () => {
  const failures = []

  const appSource = await readText('src/App.jsx')
  assertCheck(
    appSource.includes('<a className="skip-link" href="#main-content">'),
    'Missing skip link targeting #main-content in src/App.jsx',
    failures
  )

  const publicMainPages = [
    'src/pages/Home/Home.jsx',
    'src/pages/About/About.jsx',
    'src/pages/Team/Team.jsx',
    'src/pages/Events/Events.jsx',
    'src/pages/Media/Media.jsx',
    'src/pages/Blog/Blog.jsx',
    'src/pages/Contact/Contact.jsx',
    'src/pages/Testimonies/Testimonies.jsx'
  ]

  for (const pagePath of publicMainPages) {
    const source = await readText(pagePath)
    assertCheck(
      source.includes('<main id="main-content"'),
      `${pagePath} is missing <main id="main-content">`,
      failures
    )
  }

  const newsletterModalSource = await readText('src/pages/Home/NewsletterModal.jsx')
  assertCheck(
    newsletterModalSource.includes('role="dialog"') && newsletterModalSource.includes('aria-modal="true"'),
    'Home newsletter modal is missing dialog accessibility attributes.',
    failures
  )

  const eventModalSource = await readText('src/pages/Events/EventModal.jsx')
  assertCheck(
    eventModalSource.includes('role="dialog"') && eventModalSource.includes('aria-modal="true"'),
    'Events details modal is missing dialog accessibility attributes.',
    failures
  )

  const blogSource = await readText('src/pages/Blog/Blog.jsx')
  assertCheck(
    blogSource.includes('role="dialog"') && blogSource.includes('aria-modal="true"'),
    'Blog modal is missing dialog accessibility attributes.',
    failures
  )

  const teamSource = await readText('src/pages/Team/Team.jsx')
  assertCheck(
    teamSource.includes('role="dialog"') && teamSource.includes('aria-modal="true"'),
    'Team unit modal is missing dialog accessibility attributes.',
    failures
  )

  const formLabelChecks = [
    {
      path: 'src/pages/Home/NewsletterModal.jsx',
      patterns: ['htmlFor="home-newsletter-name"', 'htmlFor="home-newsletter-phone"', 'htmlFor="home-newsletter-email"']
    },
    {
      path: 'src/components/layout/Footer/Footer.jsx',
      patterns: ['htmlFor="footer-newsletter-name"', 'htmlFor="footer-newsletter-email"']
    },
    {
      path: 'src/pages/Events/EventSubscribeForm.jsx',
      patterns: ['htmlFor="event-reminder-frequency"']
    }
  ]

  for (const check of formLabelChecks) {
    const source = await readText(check.path)
    for (const pattern of check.patterns) {
      assertCheck(
        source.includes(pattern),
        `${check.path} is missing expected accessible label binding: ${pattern}`,
        failures
      )
    }
  }

  const imageScanTargets = [
    'src/pages/Home/Home.jsx',
    'src/pages/About/About.jsx',
    'src/pages/Team/Team.jsx',
    'src/pages/Events/Events.jsx',
    'src/pages/Media/Media.jsx',
    'src/pages/Blog/Blog.jsx',
    'src/pages/Contact/Contact.jsx',
    'src/pages/Testimonies/Testimonies.jsx',
    'src/components/layout/Header/Header.jsx',
    'src/components/layout/Footer/Footer.jsx'
  ]

  const imgWithoutAltRegex = /<img\b(?![^>]*\balt=)[^>]*>/g
  for (const targetPath of imageScanTargets) {
    const source = await readText(targetPath)
    const missingAlts = source.match(imgWithoutAltRegex)
    assertCheck(
      !missingAlts || missingAlts.length === 0,
      `${targetPath} has image tags without alt attributes (${missingAlts ? missingAlts.length : 0}).`,
      failures
    )
  }

  if (failures.length > 0) {
    console.error('[qa:accessibility] Failed checks:')
    for (const failure of failures) {
      console.error(`- ${failure}`)
    }
    process.exitCode = 1
    return
  }

  console.log('[qa:accessibility] Passed all accessibility smoke checks.')
}

main().catch((error) => {
  console.error('[qa:accessibility] Unexpected error:', error)
  process.exitCode = 1
})
