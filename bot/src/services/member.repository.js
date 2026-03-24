import { query } from '../db/connection.js'
import { hashPhoneNumber, normalizeEmail, normalizeName, normalizeNameKey, normalizePhoneNumber } from './identity.service.js'

export const syncMemberProfileFromVisitor = async (visitor, options = {}) => {
  if (!visitor?.id) return null

  const lifecycleState = String(options.lifecycleState || visitor.member_state || 'active').trim() || 'active'
  const fullName = normalizeName(visitor.name || '')
  const normalizedName = normalizeNameKey(fullName)
  const phoneNumber = normalizePhoneNumber(visitor.phone_number || '')
  const phoneHash = hashPhoneNumber(phoneNumber)
  const email = normalizeEmail(visitor.email || '')
  const joinedAt = visitor.first_visit_date || null
  const lastSeenAt = visitor.last_attendance || null

  const result = await query(
    `
    INSERT INTO member_profiles (
      visitor_id,
      full_name,
      normalized_name,
      email,
      phone_number,
      phone_hash,
      lifecycle_state,
      lifecycle_reason,
      joined_at,
      last_seen_at,
      moved_at,
      moved_to,
      tags,
      metadata
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    ON CONFLICT (visitor_id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        normalized_name = EXCLUDED.normalized_name,
        email = EXCLUDED.email,
        phone_number = EXCLUDED.phone_number,
        phone_hash = EXCLUDED.phone_hash,
        lifecycle_state = EXCLUDED.lifecycle_state,
        lifecycle_reason = COALESCE(EXCLUDED.lifecycle_reason, member_profiles.lifecycle_reason),
        joined_at = COALESCE(member_profiles.joined_at, EXCLUDED.joined_at),
        last_seen_at = COALESCE(EXCLUDED.last_seen_at, member_profiles.last_seen_at),
        moved_at = COALESCE(EXCLUDED.moved_at, member_profiles.moved_at),
        moved_to = COALESCE(EXCLUDED.moved_to, member_profiles.moved_to),
        tags = COALESCE(EXCLUDED.tags, member_profiles.tags),
        metadata = COALESCE(member_profiles.metadata, '{}'::jsonb) || COALESCE(EXCLUDED.metadata, '{}'::jsonb),
        updated_at = now()
    RETURNING *
    `,
    [
      visitor.id,
      fullName || null,
      normalizedName || null,
      email || null,
      phoneNumber || null,
      phoneHash || null,
      lifecycleState,
      options.lifecycleReason || null,
      joinedAt,
      lastSeenAt,
      lifecycleState === 'moved' ? new Date() : null,
      lifecycleState === 'moved' ? options.movedTo || visitor.moved_to || null : null,
      Array.isArray(visitor.tags) ? visitor.tags : [],
      options.metadata || {}
    ]
  )

  return result.rows[0] || null
}

export const listMemberProfiles = async (filters = {}) => {
  const conditions = ['deleted_at IS NULL']
  const values = []

  if (filters.lifecycleState) {
    values.push(String(filters.lifecycleState).trim())
    conditions.push(`lifecycle_state = $${values.length}`)
  }

  if (filters.queryText) {
    values.push(`%${String(filters.queryText).trim().toLowerCase()}%`)
    conditions.push(
      `(LOWER(COALESCE(full_name, '')) LIKE $${values.length} OR LOWER(COALESCE(email, '')) LIKE $${values.length} OR COALESCE(phone_number, '') LIKE $${values.length})`
    )
  }

  values.push(Math.max(1, Math.min(Number(filters.limit) || 200, 1000)))

  const result = await query(
    `
    SELECT *
    FROM member_profiles
    WHERE ${conditions.join(' AND ')}
    ORDER BY updated_at DESC
    LIMIT $${values.length}
    `,
    values
  )

  return result.rows
}

export const getMemberProfileByVisitorId = async (visitorId) => {
  const result = await query('SELECT * FROM member_profiles WHERE visitor_id = $1 LIMIT 1', [visitorId])
  return result.rows[0] || null
}

export const getMemberProfileById = async (id) => {
  const result = await query('SELECT * FROM member_profiles WHERE id = $1 LIMIT 1', [id])
  return result.rows[0] || null
}

export const updateMemberLifecycle = async (id, updates = {}) => {
  const lifecycleState = updates.lifecycleState ? String(updates.lifecycleState).trim() : null
  const lifecycleReason = updates.lifecycleReason ? String(updates.lifecycleReason).trim() : null
  const movedTo = updates.movedTo ? String(updates.movedTo).trim() : null
  const notes = updates.notes !== undefined ? String(updates.notes || '').trim() : null
  const tags = Array.isArray(updates.tags) ? updates.tags.map((tag) => String(tag || '').trim()).filter(Boolean) : null
  const lastSeenAt = updates.lastSeenAt || null

  const result = await query(
    `
    UPDATE member_profiles
    SET lifecycle_state = COALESCE($1, lifecycle_state),
        lifecycle_reason = COALESCE($2, lifecycle_reason),
        moved_to = COALESCE($3, moved_to),
        moved_at = CASE
          WHEN COALESCE($1, lifecycle_state) = 'moved' THEN COALESCE(moved_at, now())
          ELSE moved_at
        END,
        notes = COALESCE($4, notes),
        tags = COALESCE($5, tags),
        last_seen_at = COALESCE($6, last_seen_at),
        updated_at = now()
    WHERE id = $7 AND deleted_at IS NULL
    RETURNING *
    `,
    [lifecycleState, lifecycleReason, movedTo, notes, tags, lastSeenAt, id]
  )

  const member = result.rows[0] || null

  if (member?.visitor_id && lifecycleState) {
    await query(
      `
      UPDATE visitors
      SET member_state = $1,
          moved_to = COALESCE($2, moved_to),
          moved_at = CASE WHEN $1 = 'moved' THEN COALESCE(moved_at, now()) ELSE moved_at END,
          updated_at = now()
      WHERE id = $3
      `,
      [lifecycleState, movedTo, member.visitor_id]
    )
  }

  return member
}

export const softDeleteMemberProfileByVisitorId = async (visitorId, options = {}) => {
  const deletedReason = String(options.reason || 'privacy_request')
  const purgeAfterDays = Number(options.purgeAfterDays || 30)

  const result = await query(
    `
    UPDATE member_profiles
    SET deleted_at = now(),
        deleted_reason = $1,
        purge_after = now() + make_interval(days => $2),
        updated_at = now()
    WHERE visitor_id = $3
    RETURNING *
    `,
    [deletedReason, purgeAfterDays, visitorId]
  )

  return result.rows[0] || null
}
