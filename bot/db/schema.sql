CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS visitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  email TEXT,
  phone_number TEXT UNIQUE NOT NULL,
  first_visit_date DATE,
  consented_at TIMESTAMP WITH TIME ZONE,
  is_subscribed BOOLEAN DEFAULT TRUE,
  do_not_contact BOOLEAN DEFAULT FALSE,
  tags TEXT[],
  reminder_preferences JSONB DEFAULT '{"serviceReminders":true,"eventReminders":true,"eventReminderFrequency":"weekly","eventIds":[]}'::jsonb,
  timezone TEXT DEFAULT 'Africa/Lagos',
  delivery_failures_count INTEGER DEFAULT 0,
  last_delivery_failure_at TIMESTAMP WITH TIME ZONE,
  delivery_blocked_until TIMESTAMP WITH TIME ZONE,
  last_attendance DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_time TIME,
  reminder_start_date DATE,
  reminder_frequency TEXT DEFAULT 'weekly',
  location TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id UUID REFERENCES visitors(id) ON DELETE SET NULL,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  job_id TEXT,
  provider_message_id TEXT,
  provider_name TEXT,
  message_type TEXT DEFAULT 'text',
  message_fingerprint TEXT,
  message_text TEXT,
  sent_time TIMESTAMP WITH TIME ZONE,
  status TEXT,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS opt_outs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT UNIQUE,
  reason TEXT,
  source TEXT DEFAULT 'whatsapp',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scheduled_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT,
  payload JSONB,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending',
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS attendance_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL,
  service_date DATE NOT NULL,
  code TEXT,
  qr_token_hash TEXT,
  source_service TEXT DEFAULT 'attendance-service',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS attendance_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkin_id TEXT UNIQUE,
  session_id TEXT NOT NULL REFERENCES attendance_sessions(session_id) ON DELETE CASCADE,
  checkin_type TEXT NOT NULL,
  attendee_name TEXT,
  helper_name TEXT,
  assisted_name TEXT,
  phone_hash TEXT,
  token_hash TEXT,
  fingerprint_hash TEXT,
  ip_hash TEXT,
  source_service TEXT DEFAULT 'attendance-service',
  occurred_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS member_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id UUID UNIQUE REFERENCES visitors(id) ON DELETE SET NULL,
  full_name TEXT,
  normalized_name TEXT,
  email TEXT,
  phone_number TEXT,
  phone_hash TEXT,
  lifecycle_state TEXT NOT NULL DEFAULT 'active' CHECK (lifecycle_state IN ('new', 'active', 'inactive', 'moved')),
  lifecycle_reason TEXT,
  joined_at DATE,
  last_seen_at DATE,
  moved_at TIMESTAMP WITH TIME ZONE,
  moved_to TEXT,
  tags TEXT[],
  notes TEXT,
  metadata JSONB,
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_reason TEXT,
  purge_after TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS prayer_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id UUID REFERENCES visitors(id) ON DELETE SET NULL,
  member_profile_id UUID REFERENCES member_profiles(id) ON DELETE SET NULL,
  requester_name TEXT NOT NULL,
  email TEXT,
  phone_number TEXT,
  phone_hash TEXT,
  title TEXT,
  request_text TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'urgent')),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'prayed', 'closed')),
  is_confidential BOOLEAN DEFAULT TRUE,
  assigned_to TEXT,
  notes TEXT,
  source TEXT DEFAULT 'web',
  resolved_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_reason TEXT,
  purge_after TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS event_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  visitor_id UUID REFERENCES visitors(id) ON DELETE SET NULL,
  member_profile_id UUID REFERENCES member_profiles(id) ON DELETE SET NULL,
  full_name TEXT,
  email TEXT,
  phone_number TEXT,
  phone_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'going' CHECK (status IN ('going', 'interested', 'cancelled', 'waitlist')),
  notes TEXT,
  source TEXT DEFAULT 'web',
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_reason TEXT,
  purge_after TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (event_id, phone_hash)
);

CREATE TABLE IF NOT EXISTS visitor_duplicates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_visitor_id UUID NOT NULL REFERENCES visitors(id) ON DELETE CASCADE,
  duplicate_visitor_id UUID REFERENCES visitors(id) ON DELETE SET NULL,
  rule_code TEXT NOT NULL,
  confidence SMALLINT DEFAULT 50,
  details JSONB,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'merged', 'dismissed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  UNIQUE (primary_visitor_id, duplicate_visitor_id, rule_code)
);

CREATE TABLE IF NOT EXISTS message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key TEXT NOT NULL UNIQUE,
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS holiday_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  holiday_date DATE NOT NULL,
  holiday_name TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT '*',
  skip_reminders BOOLEAN DEFAULT TRUE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (holiday_date, timezone)
);

CREATE TABLE IF NOT EXISTS conversation_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id UUID REFERENCES visitors(id) ON DELETE SET NULL,
  phone_number TEXT,
  feedback_text TEXT NOT NULL,
  source TEXT DEFAULT 'whatsapp',
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Ensure older databases are forward-compatible with the current repository logic
-- before creating indexes that depend on newly added columns.
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS normalized_name TEXT;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS phone_hash TEXT;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS member_state TEXT DEFAULT 'active';
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS moved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS moved_to TEXT;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS deleted_reason TEXT;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS purge_after TIMESTAMP WITH TIME ZONE;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS privacy_redacted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS reminder_preferences JSONB DEFAULT '{"serviceReminders":true,"eventReminders":true,"eventReminderFrequency":"weekly","eventIds":[]}'::jsonb;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS delivery_failures_count INTEGER DEFAULT 0;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS last_delivery_failure_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS delivery_blocked_until TIMESTAMP WITH TIME ZONE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS provider_name TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_fingerprint TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS capacity_limit INTEGER;
ALTER TABLE events ADD COLUMN IF NOT EXISTS rsvp_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS deleted_reason TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS purge_after TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_visitors_phone ON visitors(phone_number);
CREATE INDEX IF NOT EXISTS idx_visitors_subscribed ON visitors(is_subscribed);
CREATE INDEX IF NOT EXISTS idx_visitors_delivery_failures ON visitors(delivery_failures_count);
CREATE INDEX IF NOT EXISTS idx_events_event_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_fingerprint ON messages(message_fingerprint);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_time ON scheduled_jobs(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_service_date ON attendance_sessions(service_date);
CREATE INDEX IF NOT EXISTS idx_attendance_checkins_session ON attendance_checkins(session_id);
CREATE INDEX IF NOT EXISTS idx_member_profiles_state ON member_profiles(lifecycle_state);
CREATE INDEX IF NOT EXISTS idx_member_profiles_phone_hash ON member_profiles(phone_hash);
CREATE INDEX IF NOT EXISTS idx_prayer_requests_status ON prayer_requests(status);
CREATE INDEX IF NOT EXISTS idx_prayer_requests_phone_hash ON prayer_requests(phone_hash);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_event_id ON event_rsvps(event_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_status ON event_rsvps(status);
CREATE INDEX IF NOT EXISTS idx_visitor_duplicates_primary ON visitor_duplicates(primary_visitor_id);
CREATE INDEX IF NOT EXISTS idx_visitor_duplicates_status ON visitor_duplicates(status);
CREATE INDEX IF NOT EXISTS idx_message_templates_key ON message_templates(template_key);
CREATE INDEX IF NOT EXISTS idx_holiday_exceptions_date ON holiday_exceptions(holiday_date);
CREATE INDEX IF NOT EXISTS idx_conversation_feedback_created ON conversation_feedback(created_at DESC);

CREATE TABLE IF NOT EXISTS giving_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id UUID REFERENCES visitors(id) ON DELETE SET NULL,
  reference TEXT UNIQUE NOT NULL,
  provider TEXT NOT NULL,
  status TEXT NOT NULL,
  amount_kobo INTEGER,
  currency TEXT DEFAULT 'NGN',
  fund TEXT DEFAULT 'general',
  donor_name TEXT,
  donor_email TEXT,
  donor_phone TEXT,
  message TEXT DEFAULT '',
  source TEXT DEFAULT 'website',
  provider_status TEXT DEFAULT '',
  provider_message TEXT DEFAULT '',
  tx_hash TEXT,
  wallet_address TEXT,
  initialized_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  paid_at TIMESTAMPTZ,
  timeline JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_giving_tx_reference ON giving_transactions(reference);
CREATE INDEX IF NOT EXISTS idx_giving_tx_visitor ON giving_transactions(visitor_id);
CREATE INDEX IF NOT EXISTS idx_giving_tx_status ON giving_transactions(status);
CREATE INDEX IF NOT EXISTS idx_giving_tx_fund ON giving_transactions(fund);

-- Store plain qr_token so attendance service can rehydrate after restart
ALTER TABLE attendance_sessions ADD COLUMN IF NOT EXISTS qr_token TEXT;

INSERT INTO message_templates (template_key, channel, content, metadata)
VALUES
  ('service_reminder', 'whatsapp', 'Hi {{name}}, just a quick reminder from FGC Upper Room. Sunday service starts at {{serviceTime}} tomorrow. {{specialLine}} See you if you can make it. God bless you. Reply STOP to opt out.', '{"category":"reminder"}'::jsonb),
  ('event_reminder', 'whatsapp', 'Hi {{name}}, {{eventTitle}} is coming up on {{eventDate}}. {{eventTimeLine}} {{registrationLine}} Hope you can make it. God bless you. Reply STOP to opt out.', '{"category":"reminder"}'::jsonb),
  ('welcome_message', 'whatsapp', 'Welcome to FGC Upper Room{{nameSuffix}}. You are now on our WhatsApp list for Sunday reminders and event updates. Reply STOP any time to unsubscribe.', '{"category":"system"}'::jsonb),
  ('faq_service_time', 'whatsapp', 'Sunday youth service starts at 8:00 AM. First Sundays start at 7:30 AM.', '{"category":"faq"}'::jsonb),
  ('faq_location', 'whatsapp', 'We meet at 36 Shell Location Road, Mgbuoba, Port Harcourt.', '{"category":"faq"}'::jsonb),
  ('faq_contact', 'whatsapp', 'You can reach us on WhatsApp at +2347031526399 or email upperroom@fgcmgbuoba.org.', '{"category":"faq"}'::jsonb),
  ('prayer_ack', 'whatsapp', 'Thanks {{name}}. We have your prayer request, and the prayer team will keep it in prayer.', '{"category":"inbound"}'::jsonb),
  ('feedback_ack', 'whatsapp', 'Thanks {{name}}. We have your feedback and will read it carefully.', '{"category":"inbound"}'::jsonb),
  ('default_auto_reply', 'whatsapp', 'Thanks for reaching out to FGC Upper Room. Send PRAYER for prayer requests, FEEDBACK for feedback, or ask about service time, location, or contact details.', '{"category":"inbound"}'::jsonb),
  ('giving_thanks', 'whatsapp', 'Hi {{firstName}}, thank you for your generous gift of ₦{{amountNaira}} to the {{fund}} Fund. Your giving is a blessing to this community. May God richly reward your faithfulness. – FGC Upper Room. Reply STOP to opt out.', '{"category":"giving"}'::jsonb)
ON CONFLICT (template_key) DO NOTHING;

INSERT INTO holiday_exceptions (holiday_date, holiday_name, timezone, skip_reminders, metadata)
VALUES
  ('2026-01-01', 'New Year''s Day', '*', TRUE, '{"default":true}'::jsonb),
  ('2026-12-25', 'Christmas Day', '*', TRUE, '{"default":true}'::jsonb)
ON CONFLICT (holiday_date, timezone) DO NOTHING;
