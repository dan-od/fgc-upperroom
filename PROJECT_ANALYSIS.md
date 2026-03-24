# FGC Upperroom Project - Comprehensive Feature Analysis

**Project Date:** March 18, 2026

## Executive Summary

The FGC Upperroom website is a sophisticated full-stack project combining a React-based public website with an independently running WhatsApp bot backend. It serves the youth fellowship of Foursquare Gospel Church Mgbuoba with visitor engagement, content management, event coordination, and automated reminder services.

---

## 1. EXISTING FEATURES

### 1.1 **Public Website Pages** (Frontend)

#### Home (`/`)
- **Hero Section** with Foursquare Gospel symbols (Cross, Dove, Cup, Crown)
- **Pastor's Welcome** section with featured message
- **"What We Believe" section** displaying the four pillars of Foursquare faith
- **"New Here? Welcome!"** onboarding section with 4 key value propositions
- **Social Media Links** section with clickable icons (Facebook, Instagram, YouTube, TikTok, X)
- **Event Countdown** timer for featured events
- **Blog Preview** section showing latest posts
- **Testimonials Carousel** displaying member stories
- **Call-to-action Buttons** linking to events, about, contact

#### About (`/about`)
- **Fellowship Identity** - explains "Upperroom" concept tied to Acts 1:13-14
- **Vision & Mission** statements
- **Full Foursquare Gospel Theology** explained with biblical references
- **Church Structure** under Rev. Dr. Martins Okoro's leadership

#### Events (`/events`)
- **Featured Event Carousel** with countdown timer to next major event
- **Event Grid Display** (carousel and modal views)
- **Event Details Modal** showing:
  - Title, date, time, location
  - Category, pricing, organizer contact
  - Share functionality (WhatsApp, Facebook, Twitter, Email)
- **Event Registration Form** - capture name, phone, email for event notifications
- **Sample Events** (Upper Room Week, Youth Camp, Thanksgiving & Carol, New Year Praise Night, Teens Summit)

#### Media (`/media`)
- **Advanced Gallery** with multiple filtering/discovery layers:
  - **Category Filters**: All Content, Youth Focus, Sermons, Audio/Music, Worship, Community, Events
  - **Date Range Filters**: All Time, This Month, Last 3 Months, This Year
  - **Pagination**: 6 items per page with navigation controls
- **Lightbox Modal** for full-screen viewing with navigation
- **YouTube Integration**: Embedded sermon videos with proper extraction
- **Multi-asset Lightbox**: View photos, videos, audio alongside each item
- **Asset Types**: Supports images, videos, audio files with appropriate icons
- **Admin Media Upload**: Server-backed media storage with metadata tracking

#### Blog (`/blog`)
- **Category Filtering**: All, Devotionals, Sunday School, Articles, Blog Posts
- **Search Functionality**: Query by title, excerpt, or author
- **Post Display Cards**: Shows title, excerpt, author, date, read time
- **Post Detail Modal**: Full content view with:
  - Download option for Sunday School materials (as .txt file)
  - Social sharing capabilities
- **Responsive Grid Layout**
- **Post Organization**: Sorted by date (newest first)

#### Testimonies (`/testimonies`)
- **Testimony Grid Display**: Shows member testimonies with:
  - Quote text
  - Author name and role
  - Avatar with first initial
- **Empty State**: Helpful message when no testimonies exist
- **Dynamic Content**: Admin-managed via TestimonyManager

#### Team (`/team`)
- **Leadership Section**: Display of Senior Pastor, Youth Pastor, Youth Advisor with roles
- **Executive Committee**: President, Vice President, Secretary
- **Department Listings**: 9 departments with icons and descriptions
  - Choir, Media, Ushers, Drama, Sanctuary, Protocol, Prayer, Greeters, Welfare
- **Team Card UI**: Responsive grid layout with placeholder images

#### Contact (`/contact`)
- **Contact Form**: Name, email, subject, message collection
- **Location Information**: Address with map reference
- **Contact Channels**: Phone, email, WhatsApp
- **Service Times**: Clear schedule display (1st Sunday 7:30 AM, Others 8:00 AM)
- **Social Media Links**: All platforms linked for follow-up

### 1.2 **Admin Dashboard** (`/admin`)

**Authentication**: Password-protected access (stored in `VITE_ADMIN_PASSWORD`)

#### Available Admin Modules

**Dashboard**
- High-level ministry performance snapshot
- Publishing velocity metrics
- Activity summaries
- Quick navigation to other tools

**Events Manager**
- Create, read, update, delete events
- Event details: title, date, time, location, description
- Category organization
- Connected to bot API for reminder scheduling

**Media Manager**
- Upload media files (images, video, audio)
- Organize by category
- Batch upload support (up to 25 files)
- Metadata management
- File browser and preview

**Blog Manager**
- Create/edit/delete blog posts
- WYSIWYG content editor
- Category assignment (Articles, Devotionals, Sunday School)
- Author and date management
- Post preview

**Testimonies Manager**
- Create/manage member testimonies
- Quote and author information
- Role/designation field
- Deletion capability

**Visitors Manager**
- View all subscribed visitors
- Track subscription status
- Search/filter capabilities
- Export functionality

**Attendance Manager**
- Generate QR code for Sunday service attendance
- Create attendance code for physical sharing
- Date-specific for different services

**Analytics Dashboard**
- Recent activity logs
- System statistics
- Visitor engagement metrics
- Trends and performance indicators

**Settings**
- Admin configuration options
- Possibly password/security settings
- System preferences

### 1.3 **WhatsApp Bot Backend** (Node.js Express API)

**Architecture**: Runs on port 4100 with `/bot/` path prefix, separate from website frontend

#### Core Features

**Visitor Management**
- **Registration**: Capture name, phone, email via POST /bot/api/visitors
- **Subscription Toggle**: Enable/disable reminders for existing visitors
- **Opt-out Support**: Permanent "Do Not Contact" marking
- **Visitor Retrieval**: Query by phone number
- **List Subscribers**: Get all subscribed visitors

**Event Management**
- **Event CRUD**: Create, read, update, delete events
- **Reminder Scheduling**: Automatically calculates reminder dates
- **Event Listing**: Filter upcoming events
- **Event Details**: Tracks date, time, location, description

**Automated Service Reminders** (WhatsApp)
- **Schedule**: Every Saturday at 12:00 PM WAT (Africa/Lagos timezone)
- **Service Times**:
  - First Sunday: 7:30 AM
  - Other Sundays: 8:00 AM
- **Personalization**: LLM-powered message generation
- **Opt-out Detection**: Automatic handling of "STOP" replies

**Event Reminders**
- **Frequency**: Weekly reminders starting 1 month before event
- **Message**: Personalized event details and logistics
- **Rate Limiting**: 60 messages/minute to prevent API throttling

**Message Preview API**
- Preview service reminder content before sending
- Preview event reminder templates
- Test LLM message generation

**Bulk Operations**
- **CSV Import**: Bulk import visitor data
- **Batch Processing**: Up to 25 file uploads
- **Data Sanitization**: Automatic phone number normalization

**Message Logging & Analytics**
- **Message Query**: Historical lookups with filtering
- **Analytics Endpoints**: 
  - System statistics
  - Recent activity (last 50 messages)
  - Visitor engagement metrics

**LLM Message Generation** (Personalized reminders)
- **Provider Chain** (Auto-select with fallback):
  1. Vertex AI Gemini (Google Cloud)
  2. OpenAI GPT
  3. Google Gemini Direct API
  4. Static template fallback
- **Context**: Uses visitor name, event details, service times
- **Purpose**: Highly personalized reminder messages

**Queue Management** (BullMQ + Redis)
- **Job Scheduling**: BullMQ for reliable message queuing
- **Retry Logic**: Exponential backoff for failed messages
- **Worker Process**: Separate process for message dispatch
- **Performance**: Non-blocking async processing

**Database** (PostgreSQL)
- **Visitors Table**: Phone, name, email, subscription status, timezone, tags
- **Events Table**: Title, description, date, time, location, reminder schedule
- **Messages Table**: Message history with delivery status, provider IDs
- **Opt-outs Table**: Permanent suppression list with "Do Not Contact" flags

**Monitoring & Health Checks**
- **Health Endpoint**: GET /bot/monitoring/health
- **Database Status**: Checks PostgreSQL connectivity
- **Redis Status**: Validates queue connection
- **Error Tracking**: 24-hour error summary
- **Alert System**: Active alerts with webhook support

**WhatsApp Integration** (Meta Cloud API)
- **Webhook Handling**: Receive inbound messages and delivery statuses
- **Template Messages**: Pre-approved WhatsApp message templates
- **Inbound Processing**: Auto-detect and handle STOP replies
- **Phone Number Normalization**: Strips formatting for consistent routing

### 1.4 **Data Persistence & Storage**

**Frontend**
- **localStorage**: Browser-based persistence for:
  - subscription status (SUBSCRIBED_KEY)
  - Admin session authentication
- **In-Memory**: Component react state for UI interactions

**Backend**
- **PostgreSQL Database**: Primary data store
  - Visitors and subscriptions
  - Events and reminders
  - Message logs
  - Opt-out records
- **JSON File Storage** (`data/admin-media.json`):
  - Media metadata (fallback for admin-media API)
  - File paths, categories, descriptions
- **File System** (`public/uploads/media`):
  - Physical uploaded media files
  - Images, videos, audio files
  - Organized by upload timestamp

### 1.5 **API Integration Points**

**Frontend → Backend Communication**
- **Subscribe Visitor**: POST `/bot/api/visitors`
- **Event Registration**: Triggers visitor subscription
- **Media CRUD**: 
  - GET `/admin/media` - List all media
  - PUT `/admin/media` - Bulk update
  - POST `/admin/media/upload` - File upload (multipart)

**Website Server (`server.ts`)**
- **Media Management Endpoints**: Upload and retrieve admin media
- **Vite Development Server**: Provides frontend on port 3000
- **Proxy Configuration**: Routes `/bot/*` to bot API at 4100

**Bot API Endpoints**
- Comprehensive REST API for all bot operations (see Bot README)

### 1.6 **Design & Branding**

**Color Scheme** (Foursquare Gospel Symbolism)
- `--cross-red: #8a161e` - Jesus the Savior
- `--dove-yellow: #d4a82e` - Jesus the Baptizer  
- `--cup-blue: #2d3a7a` - Jesus the Healer
- `--crown-purple: #5a4494` - Jesus the Coming King
- `--main-cream: #e8dfc5` - Background

**Typography & Layout**
- Modern responsive design
- Mobile-first approach
- Hero sections with overlays
- Grid-based component layouts
- Color-coded sections by theme

**UI Components**
- Reusable Button component (variants: white, outline-light, primary, outline)
- Card component for content blocks
- SectionHeader for consistent page sections
- Modal system for details/forms
- Carousel implementations
- Countdown timer component

---

## 2. MISSING OR INCOMPLETE FEATURES

### 2.1 **Frontend Website Gaps**

#### Content & Features
- [ ] **Blog Posts**: BLOG_POSTS array is empty - no actual blog content exists
- [ ] **Testimonies Starter Content**: Public testimonies page and admin management UI exist, but testimonies are empty by default
- [ ] **Team Photos**: Team page shows placeholders (no real photos linked)
- [ ] **Media Gallery Content**: Gallery is set up but lacks sample media items
- [ ] **Events Year-round Planning**: Only sample hardcoded events; needs dynamic integration with bot events
- [ ] **YouTube Channel Integration**: Notes mention auto-sync from YouTube but implementation unclear
- [ ] **Sermon Archive Search**: Media page has categories but lacks deep search (by speaker, date range, topic)
- [ ] **Prayer Requests Section**: No dedicated page for community prayer requests
- [ ] **Small Groups/Bible Studies**: No listing or management of small group activities
- [ ] **Member Directory**: No way to view/search other members (privacy permitting)

#### User Experience
- [ ] **Comment System**: No ability to leave comments on blog posts or testimonies
- [ ] **Ratings/Reactions**: No engagement features like "Amen", heart reactions, shares
- [ ] **Email Newsletter Signup**: Only WhatsApp subscription exists; no email newsletter
- [ ] **Event Reminders Choice**: Subscribe to ALL reminders or none - no granular event filtering
- [ ] **Personalized Dashboard**: No logged-in user dashboard showing personalized content
- [ ] **Content Recommendations**: No "related posts" or "similar events" suggestions
- [ ] **Public Site Dark Mode**: Admin panel supports dark mode, but the public website remains light-only
- [ ] **Language Support**: Only English; no multi-language support (useful for missionary work)
- [ ] **Accessibility Features**: Limited ARIA labels, no keyboard navigation testing mentioned

#### Mobile Experience
- [ ] **Progressive Web App (PWA)**: No service worker or offline support
- [ ] **Mobile Navigation**: Sidebars likely collapse but no mention of mobile-optimized UX
- [ ] **Touch Gestures**: No swipe support for carousels/galleries mentioned
- [ ] **Mobile Forms**: Contact and event forms may not be fully optimized

#### Contact & Communication
- [ ] **Live Chat**: No real-time support or chat widget
- [ ] **Calendar Integration**: No way to add events to Google/Outlook calendars
- [ ] **Notification Preferences**: Users can't choose notification frequency/timing
- [ ] **Message Response System**: No automated response to contact form submissions

### 2.2 **Admin Dashboard Gaps**

#### Content Management
- [ ] **Batch Editing**: No bulk edit operations for events, blog posts, or media
- [ ] **Version Control**: No rollback or edit history for content
- [ ] **Editorial Workflow Depth**: Blog posts support draft/published states, but there is no review history or approval flow
- [ ] **Scheduled Publishing**: No ability to schedule posts/events for future publication
- [ ] **Asset Organization**: No folder structure for media organization (flat upload structure)
- [ ] **Advanced Media Search**: Admin media manager supports basic search, but there is no deep metadata search or saved filters
- [ ] **Collaborative Editing**: No multi-user editing or concurrent edit detection
- [ ] **Approval Workflow**: No review/approval steps before content goes live
- [ ] **Content Reuse**: No easy way to reuse content blocks across pages

#### Reporting & Insights
- [ ] **Export Data**: Limited export functionality (analytics may not be exportable)
- [ ] **Report Scheduling**: Can't schedule automated reports to stakeholders
- [ ] **Custom Reports**: No ability to create custom analytics views
- [ ] **Visitor Segmentation**: Analytics show engagement but no segmentation analysis
- [ ] **Attendance Trends**: No historical attendance tracking/trends
- [ ] **Event ROI**: No metrics on event success (sign-ups vs. attendance)
- [ ] **Sermon Series Tracking**: No way to group sermons into series

#### User Management  
- [ ] **Multi-admin Support**: Only single admin password; no role-based access control
- [ ] **Audit Logs**: No logging of who made what changes and when
- [ ] **Admin Permissions**: All admins can do everything; no granular permissions
- [ ] **Two-Factor Authentication**: Admin login only uses password
- [ ] **Admin Password Reset**: No self-service password reset mechanism

#### Notifications & Automation
- [ ] **Email Syncing**: Admin events don't automatically email members
- [ ] **SMS Fallback**: If WhatsApp fails, no SMS retry option
- [ ] **Notification Rules**: Can't set conditional reminders (e.g., "remind if user hasn't attended 3 weeks")
- [ ] **Auto-escalation**: Late event responses don't trigger follow-up actions
- [ ] **Unsubscribe Management**: UI for handling opt-outs is unclear

### 2.3 **WhatsApp Bot Gaps**

#### Messaging Features
- [ ] **Two-way Conversation**: Bot only sends; doesn't process complex user queries
- [ ] **FAQ Chatbot**: No ability for members to query FAQs via bot
- [ ] **Feedback Collection**: No mechanism to collect member feedback via WhatsApp
- [ ] **Prayer Request Submission**: Can't submit prayer requests through bot
- [ ] **Registration Response**: Bot doesn't acknowledge successful registration
- [ ] **Event RSVPs**: Members can't confirm attendance via WhatsApp
- [ ] **Dynamic Templates**: Message templates are fixed; limited personalization
- [ ] **Rich Media Messages**: Only text templates; no image/video broadcasts

#### Scheduling Intelligence
- [ ] **Timezone Handling**: Fixed to Africa/Lagos; no per-user timezone support
- [ ] **Smart Reminders**: Reminders sent same time to all; no optimal delivery time
- [ ] **Holiday Exceptions**: No handling of holidays or special calendar dates
- [ ] **User Preferences**: Can't choose reminder frequency (daily, weekly, monthly)
- [ ] **Quiet Hours**: No respect for user quiet hours (e.g., no messages after 9 PM)
- [ ] **Engagement Tracking**: Bot doesn't know if member read/acted on reminder

#### Integration & Extensibility
- [ ] **CRM Integration**: No integration with ministry management software
- [ ] **Church Management System**: Not connected to Breeze, Planning Center, etc.
- [ ] **Giving Integration**: No ability to collect tithes/offerings via bot
- [ ] **Event Registration Links**: Reminders don't include direct signup links
- [ ] **Video Streaming**: No ability to stream live services via bot
- [ ] **Attendance Capture**: WhatsApp registration doesn't auto-mark attendance

#### Bot Reliability
- [ ] **Message Retry Logic**: While exponential backoff exists, message guaranteed delivery unclear
- [ ] **Bounce Handling**: No processing when numbers are invalid/inactive
- [ ] **Duplicate Prevention**: Unknown if system prevents duplicate messages
- [ ] **Rate Limit Optimization**: Currently hard-coded 60 msg/min; could be dynamic
- [ ] **Provider Failover**: If Meta API down, alternative channel unclear
- [ ] **Circuit Breaker**: No fallback if bot API completely unavailable

### 2.4 **Database & Data Gaps**

#### Missing Data Models
- [ ] **Member Profiles**: No public profiles beyond testimonies
- [ ] **Persistent Attendance History**: Attendance check-ins exist, but they are stored in-memory rather than long-term database tables
- [ ] **Giving/Tithe Records**: No financial/giving data
- [ ] **Prayer Requests**: No data model for prayer requests
- [ ] **Small Groups**: No way to organize members into groups
- [ ] **Discipleship Tracking**: No maturity levels, spiritual progress tracking
- [ ] **Event Capacity Limits**: No tracking of event capacity or RSVPs
- [ ] **Message Templates**: Templates stored in code, not database

#### Data Quality
- [ ] **Phone Validation**: No validation of phone number format/reachability
- [ ] **Duplicate Detection**: Unclear how to handle duplicate registrations
- [ ] **Repository/Schema Drift**: `visitor.repository.js` still references an `email` column not present in current `visitors` schema, causing create-visitor flow failures in direct service usage
- [ ] **Data Retention Policy**: No defined retention/cleanup policy
- [ ] **Visitor Lifecycle**: No way to mark members as inactive/moved away
- [ ] **Soft Deletes**: Unclear if deletions are hard or soft
- [ ] **Data Privacy Controls**: No GDPR/privacy control implementations

### 2.5 **Deployment & Operations Gaps**

#### Infrastructure
- [ ] **SSL/HTTPS**: Documentation doesn't mention HTTPS setup
- [ ] **Database Backups**: No backup strategy documented
- [ ] **Redis Persistence**: Unclear if Redis data is persistent
- [ ] **Load Balancing**: No multi-instance deployment strategy
- [ ] **CDN Integration**: Assets served locally; no CDN for media
- [ ] **Image Optimization**: Media uploads not automatically resized/optimized

#### Monitoring
- [ ] **Error Alerting**: Alert webhook exists but implementation unclear
- [ ] **Uptime Monitoring**: No external uptime monitoring service mentioned
- [ ] **Performance Monitoring**: No APM (Application Performance Monitoring)
- [ ] **Log Aggregation**: Logs local only; no centralized logging
- [ ] **Real User Monitoring**: No analytics on actual user performance/experience
- [ ] **Database Query Monitoring**: No query performance insights

#### Documentation
- [ ] **Architecture Diagrams**: No visual system architecture documentation
- [ ] **API Documentation**: Bot README doesn't include full request/response examples
- [ ] **Database Schema Documentation**: schema.sql exists but not explained
- [ ] **Deployment Validation**: A deployment runbook exists, but the documented process should still be verified against the current production stack
- [ ] **Troubleshooting Guide**: No common issues/fixes documented
- [ ] **Security Hardening Guide**: No security best practices documented

### 2.6 **Testing Gaps**

#### Automated Testing
- [ ] **Unit Tests**: No unit test files visible
- [ ] **Integration Tests**: No integration test suite
- [ ] **E2E Tests**: No end-to-end testing for critical flows
- [ ] **Load Testing**: Script exists (`load-test.js`) but no CI/CD integration
- [ ] **Security Tests**: No OWASP/security scanning
- [ ] **Performance Tests**: No baseline performance metrics

#### Manual Testing
- [ ] **Cross-browser Testing**: No defined browser compatibility matrix
- [ ] **Mobile Testing**: Limited mobile testing evidence
- [ ] **Accessibility Testing**: No accessibility compliance testing
- [ ] **User Acceptance Testing (UAT)**: No UAT process documented

---

## 3. ENHANCEMENT OPPORTUNITIES

### 3.1 **High-Impact Features** (Quick Wins)

1. **Populate Starter Content**
   - Add sample blog posts to show the blog feature
   - Add sample testimonies to the testimonies page
   - Add real team photos or implement better placeholder system
   - Create welcome sermon series in media gallery

2. **Improve Admin Dashboard UX**
   - Add confirmation dialogs for destructive actions
   - Add "last updated" timestamps on all content
   - Add quick stats dashboard (total members, this week's events, etc.)
   - Implement dark mode for admin panel

3. **WhatsApp Service Improvements**
   - Add "Thank you for subscribing" acknowledgment message
   - Send "Event Updated" notification when event details change
   - Add visitor count badge to show community size
   - Create event-specific opt-in (users choose which events to follow)

4. **Content Discovery**
   - Add "Related Posts" suggestions on blog
   - Add search functionality to blog and media (currently filter-only)
   - Implement breadcrumb navigation
   - Add "Popular" sorting to media gallery

5. **Mobile Experience**
   - Make navigation hamburger menu more obvious
   - Optimize contact form for mobile
   - Add mobile-specific button sizing
   - Test and fix touch interactions on carousels

### 3.2 **Medium-Impact Features** (1-2 Weeks)

1. **Email Integration**
   - Add Mailgun/Sendgrid email service
   - Create email newsletter signup separate from WhatsApp
   - Send contact form submissions via email
   - Weekly digest of blog posts and upcoming events

2. **Advanced Event Management**
   - Event capacity limits with waitlist
   - RSVP confirmation via WhatsApp
   - Event cancellation notifications
   - Calendar view (month/week grid)
   - Event export (iCal/Google Calendar)

3. **Visitor Engagement**
   - Visitor check-in system (mark attendance)
   - First-time visitor follow-up sequence
   - Member referral program
   - "Today's Attendance" live counter

4. **Admin Collaboration**
   - Role-based access control (editor, publisher, admin)
   - Content approval workflows
   - Edit history/version control
   - Concurrent edit warnings

5. **Analytics & Reporting**
   - Dashboard charts (visitors over time, engagement trends)
   - Segment reports by event, category, date range
   - Export reports as PDF/Excel
   - Email report scheduling

### 3.3 **Strategic Features** (High Value, Larger Effort)

1. **Member Portal**
   - Account creation/login (Firebase, Auth0, or custom)
   - Profile management (preferences, interests, contact update)
   - Event history and RSVP management
   - Tithe/giving records (with privacy)
   - Discipleship progress tracking

2. **Small Groups/Cell System**
   - Small group directory with leaders
   - Group meeting schedules
   - Group WhatsApp integration
   - Small group resource materials

3. **Live Streaming Integration**
   - Sunday service live stream via YouTube/Facebook Live
   - Embed on Home page
   - Automatic recording storage
   - Chat during streaming

4. **Prayer & Intercession System**
   - Prayer request submission form
   - Anonymous prayer request display (with time decay)
   - Prayer journal for members
   - Prayer request notifications to prayer team

5. **Giving/Tithes System**
   - Online giving platform (Stripe/Paystack integration)
   - Tithe history for members (private)
   - Monthly giving analytics (for admin)
   - Recurring giving setup

6. **Advanced Bot Capabilities**
   - Two-way conversation (reply to questions)
   - FAQ chatbot via NLP
   - Event venue navigation/directions
   - Sermon Q&A submission
   - Group prayer requests aggregation

### 3.4 **Platform & Technical Improvements**

1. **Performance**
   - Add image lazy loading on media gallery
   - Implement code splitting for faster page loads
   - Cache API responses (blog posts, events)
   - Optimize database queries with indexes
   - Consider CDN for media files

2. **Reliability**
   - Add comprehensive error boundaries (React)
   - Implement graceful degradation when bot API unavailable
   - Add service worker for offline content
   - Implement sentry.io for error tracking
   - Add circuit breaker for external APIs

3. **Security**
   - Implement CORS properly
   - Rate limit public endpoints
   - SQL injection protection (validate all inputs)
   - XSS protection on user-generated content
   - CSRF tokens on forms
   - Implement CSP headers
   - Admin 2FA (TOTP)

4. **Search & SEO**
   - Implement full-text search (PostgreSQL FTS or Elasticsearch)
   - Add XML sitemap
   - Add Open Graph meta tags
   - Implement breadcrumb structured data
   - Add Google Analytics 4 event tracking
   - Blog schema markup (BlogPosting)

5. **Developer Experience**
   - Add API documentation (Swagger/OpenAPI)
   - Add GraphQL layer (alternative to REST)
   - Docker deployment without docker-compose needed
   - Database migrations system
   - Automated database seeding

### 3.5 **Community & Ministry Features**

1. **Discipleship Pathways**
   - New believer curriculum with modules
   - Progress tracking for spiritual growth
   - Mentor matching system
   - Guided reading plans with daily lessons

2. **Service Opportunities**
   - Volunteer sign-up system
   - Volunteer shift management
   - Volunteer hours tracking
   - Monthly volunteer appreciation displays

3. **Youth Programs**
   - College/University ministry section
   - High school specific events
   - Professional young adults group
   - Career/internship board

4. **Missions & Outreach**
   - Mission trip tracking and giving
   - Testimonies from mission field
   - Prayer updates from missions
   - Local community service events

5. **Learning & Resources**
   - Sermon series archives with guides
   - Downloadable small group materials
   - Video tutorials on faith topics
   - Article library by topic/scripture

### 3.6 **Integration Opportunities**

1. **Third-Party Services**
   - Integrate with Stripe/Paystack for giving
   - Connect with Mailgun for email
   - Link YouTube for auto-sync sermons
   - Firebase for user authentication
   - Sentry for error tracking
   - Auth0 for member SSO

2. **Ministry Software**
   - Breeze ChMS integration
   - Planning Center integration
   - Asana for team task management
   - Zapier for workflow automation

3. **Social Integration**
   - Live Facebook event creation from admin
   - Instagram feed display on website
   - TikTok latest video embed
   - YouTube subscriber count display

---

## 4. CURRENT ARCHITECTURE SUMMARY

```
Website (Frontend)
├── React + Vite + Router
├── Pages: Home, About, Team, Events, Media, Blog, Contact, Testimonies, Admin
├── Components: Buttons, Cards, Carousels, Modals, Gallery
├── Utils: subscribeApi, mediaStorage, blogStorage, testimonyStorage
└── Storage: localStorage (browser), Server API (media metadata)

Website Server (server.ts)
├── Express.js
├── Media Upload & Management API
├── Vite proxy for development
└── Static file serving

WhatsApp Bot (Node.js on port 4100)
├── Express API
├── PostgreSQL database (visitors, events, messages)
├── Redis queue (BullMQ)
├── Scheduler (node-cron)
├── Worker process for async jobs
├── Meta WhatsApp integration
├── LLM providers (Vertex AI, OpenAI, Gemini)
└── Monitoring & health checks

Data Flow
Frontend Form → Bot API → DB → Scheduler → WhatsApp Queue → Worker → Meta API → User Phone
```

---

## 5. RECOMMENDATIONS PRIORITY MATRIX

Checked items below were verified during a codebase scan on March 20, 2026. Unchecked items are still missing, incomplete, or not yet validated end-to-end.

Execution update (March 20, 2026, follow-up run):
- Environment configuration check passed (required bot env keys present; Docker available).
- `npm run bot:validate` passed all checks (DB, Redis, required tables, write permissions).
- Reminder queue/worker flow was exercised in a controlled test run, but resulting message records were still written with `status = failed`; end-to-end reminder reliability remains unresolved.

### Must-Do (Foundation)
- [ ] Fix empty blog/testimonies with starter content
- [ ] Ensure all environments properly configured (dev, staging, prod)
- [ ] Test bot reminders end-to-end (attempted in controlled run; queue processed, but message log status remained `failed`)
- [x] Document deployment procedures
- [x] Implement basic error handling/monitoring

### Should-Do (Enhance Core)
- [ ] Add email newsletter capability
- [ ] Improve admin UX (confirmations, timestamps)
- [ ] Implement visitor member portal login
- [ ] Add search functionality
- [ ] Set up automated backups

### Nice-To-Have (Growth)
- [ ] Live streaming integration
- [ ] Online giving platform
- [ ] Advanced analytics dashboard
- [ ] Two-way bot conversations
- [ ] Small groups system

### Consider Later (Scale)
- [ ] Mobile app
- [ ] Missions system
- [ ] Discipleship curriculum
- [ ] Video on-demand platform
- [ ] Advanced CRM features

---

## 6. KNOWN PROJECT CONSTRAINTS

- **Timezone**: All bot scheduling uses `Africa/Lagos` timezone (critical for service reminder accuracy)
- **Base Path**: Frontend deployed at `/fgc-testing/` - affects all asset URLs
- **Bot Proxy**: Bot API at `/bot/*` must be running at port 4100 during development for frontend to work
- **Media Storage**: Uses both server-side files and metadata JSON; must keep in sync
- **LLM Fallback**: Message generation degrades gracefully if all LLM providers unavailable
- **Rate Limiting**: Hard-coded 60 messages/minute on WhatsApp to avoid throttling

---

## 7. FILE STRUCTURE REFERENCE

**Key Frontend Files:**
- `src/App.jsx` - Router setup and page configuration
- `src/pages/Home/Home.jsx` - Home page with hero, beliefs, new visitor section
- `src/pages/Admin/Admin.jsx` - Admin dashboard with tab-based interface
- `src/utils/subscribeApi.js` - Visitor registration to bot API
- `src/utils/mediaStorage.js` - Media CRUD helpers

**Key Backend Files:**
- `bot/src/index.js` - Bot server startup
- `bot/src/scheduler/reminder.scheduler.js` - Service and event reminder scheduling
- `bot/src/workers/reminder.worker.js` - Message dispatch worker
- `bot/src/services/whatsapp.service.js` - Meta WhatsApp API integration
- `bot/src/services/reminder.service.js` - Reminder business logic
- `bot/db/schema.sql` - PostgreSQL schema

**Configuration:**
- `.env` - Environment variables (YouTube API, WhatsApp, LLM, passwords)
- `vite.config.js` - Frontend bundler configuration
- `bot/src/config/env.js` - Bot environment validation

---

This analysis provides a complete picture of the FGC Upperroom project's current state and indicates where strategic investments in new features could drive the most value for the ministry.
