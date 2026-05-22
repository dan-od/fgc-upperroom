import { Helmet } from 'react-helmet-async'
import './Privacy.css'

const Privacy = () => (
  <main id="main-content" className="privacy-page">
    <Helmet>
      <title>Privacy Policy — FGC Upper Room Mgbuoba</title>
      <meta name="description" content="Privacy policy for FGC Upper Room Mgbuoba youth fellowship website and WhatsApp ministry tools." />
      <meta name="robots" content="noindex" />
    </Helmet>
    <section className="page-banner bg-blue">
      <div className="container">
        <h1>Privacy Policy</h1>
        <p>Last updated: May 2026</p>
      </div>
    </section>

    <section className="privacy-section">
      <div className="container privacy-content">

        <h2>1. Who We Are</h2>
        <p>
          FGC Upper Room Mgbuoba ("we", "us", "our") is the youth fellowship of the Foursquare Gospel Church,
          Mgbuoba Zonal HQ, 36 Shell Location Road, Mgbuoba, Port Harcourt, Rivers State, Nigeria.
          This policy applies to personal data collected through our website and WhatsApp ministry tools.
        </p>

        <h2>2. Data We Collect</h2>
        <table className="privacy-table">
          <thead>
            <tr>
              <th>Data Type</th>
              <th>Why We Collect It</th>
              <th>Retention Period</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Full name</td>
              <td>Personalise WhatsApp reminders and attendance records</td>
              <td>Duration of membership; deleted within 30 days of opt-out request</td>
            </tr>
            <tr>
              <td>WhatsApp phone number</td>
              <td>Deliver service and event reminders via Meta WhatsApp Business API</td>
              <td>Duration of subscription; immediately on opt-out</td>
            </tr>
            <tr>
              <td>Email address</td>
              <td>Send event communication and ministry newsletters</td>
              <td>Duration of subscription; immediately on unsubscribe</td>
            </tr>
            <tr>
              <td>Attendance records</td>
              <td>Track fellowship participation for pastoral care</td>
              <td>2 years</td>
            </tr>
            <tr>
              <td>Prayer requests</td>
              <td>Enable the prayer team to intercede; visible to prayer coordinators only</td>
              <td>90 days after submission</td>
            </tr>
            <tr>
              <td>Giving amounts and transaction records</td>
              <td>Process donations via Paystack; fulfil legal financial record-keeping obligations</td>
              <td>7 years (FIRS/CAMA requirement)</td>
            </tr>
            <tr>
              <td>WhatsApp message history</td>
              <td>Delivery tracking and compliance audit trail</td>
              <td>90 days, then purged automatically</td>
            </tr>
            <tr>
              <td>Feedback and survey responses</td>
              <td>Improve ministry services</td>
              <td>90 days</td>
            </tr>
          </tbody>
        </table>

        <h2>3. Who Has Access</h2>
        <p>
          Access to personal data is restricted by role:
        </p>
        <ul>
          <li><strong>Super Admin</strong> — full access to all member records and system logs</li>
          <li><strong>Admin</strong> — access to attendance, visitor records, and message logs</li>
          <li><strong>Prayer Coordinators</strong> — prayer request content only</li>
          <li><strong>Finance Lead</strong> — giving transaction records only</li>
        </ul>
        <p>No personal data is sold or shared with third-party marketers.</p>

        <h2>4. Third-Party Services</h2>
        <p>We use the following external processors:</p>
        <ul>
          <li>
            <strong>Meta (WhatsApp Business API)</strong> — transmits messages to subscriber phone numbers.
            Data is processed under Meta's Business Data Processing Terms.
          </li>
          <li>
            <strong>Paystack</strong> — processes giving transactions. Paystack is PCI-DSS compliant.
            See <a href="https://paystack.com/privacy" target="_blank" rel="noopener noreferrer">paystack.com/privacy</a>.
          </li>
          <li>
            <strong>OpenAI (GPT)</strong> — generates personalised WhatsApp reminder text.
            Only first names (not full names, phone numbers, or emails) are included in prompts.
            Data is processed under OpenAI's API Data Processing Agreement.
          </li>
          <li>
            <strong>Google (Gemini / Vertex AI)</strong> — alternative LLM provider for the same purpose.
            Data processed under Google Cloud's Data Processing Addendum.
          </li>
        </ul>

        <h2>5. Cross-Border Data Transfers</h2>
        <p>
          Our LLM providers (OpenAI and Google) are headquartered in the United States. When generating
          WhatsApp message content, member first names may be transferred to US-based servers. We limit
          the data sent to first name only and do not include phone numbers, email addresses, or any
          other identifying information in AI prompts.
        </p>

        <h2>6. NDPR Compliance</h2>
        <p>
          We process personal data in accordance with the Nigeria Data Protection Regulation (NDPR) 2019
          and the Nigeria Data Protection Act (NDPA) 2023. Our lawful bases are:
        </p>
        <ul>
          <li><strong>Consent</strong> — for WhatsApp subscription and email newsletters</li>
          <li><strong>Legitimate interests</strong> — for attendance records and pastoral care</li>
          <li><strong>Legal obligation</strong> — for financial records (CAMA/FIRS)</li>
        </ul>

        <h2>7. Cookies and Tracking</h2>
        <p>
          This website does not use third-party analytics or advertising cookies. We collect
          anonymous performance metrics (page load time, error rates) via a self-hosted Real
          User Monitoring (RUM) endpoint. No personally identifiable information is attached
          to these metrics.
        </p>

        <h2>8. How to Opt Out of WhatsApp Messages</h2>
        <p>
          Reply <strong>STOP</strong> to any WhatsApp message from us, or contact us at the address below.
          Your number will be removed from all future messages immediately.
        </p>

        <h2>9. Your Rights</h2>
        <p>Under the NDPA you have the right to:</p>
        <ul>
          <li>Access the personal data we hold about you</li>
          <li>Correct inaccurate data</li>
          <li>Request deletion of your data ("right to be forgotten")</li>
          <li>Object to or restrict processing</li>
          <li>Lodge a complaint with the Nigeria Data Protection Commission (NDPC)</li>
        </ul>
        <p>
          To exercise any of these rights, email us at{' '}
          <a href="mailto:info@fgcupperroom.org">info@fgcupperroom.org</a> with the subject line
          "Data Request". We will respond within 30 days.
        </p>

        <h2>10. Contact</h2>
        <p>
          FGC Upper Room Mgbuoba<br />
          36 Shell Location Road, Mgbuoba<br />
          Port Harcourt, Rivers State, Nigeria<br />
          Email: <a href="mailto:info@fgcupperroom.org">info@fgcupperroom.org</a>
        </p>

      </div>
    </section>
  </main>
)

export default Privacy
