import { query } from '../db/connection.js'

export const getSystemStats = async () => {
  const [visitorStats, eventStats, messageStats] = await Promise.all([
    query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_subscribed = true) as subscribed FROM visitors'),
    query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE event_date >= CURRENT_DATE) as upcoming FROM events'),
    query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM messages
      WHERE sent_time >= NOW() - INTERVAL '30 days'
      GROUP BY status
    `)
  ])

  const recentMessages = await query(`
    SELECT COUNT(*) as count, DATE(sent_time) as date
    FROM messages
    WHERE sent_time >= NOW() - INTERVAL '7 days'
    GROUP BY DATE(sent_time)
    ORDER BY date DESC
  `)

  const optOuts = await query('SELECT COUNT(*) as total FROM opt_outs WHERE created_at >= NOW() - INTERVAL \'30 days\'')

  return {
    visitors: {
      total: parseInt(visitorStats.rows[0]?.total || 0),
      subscribed: parseInt(visitorStats.rows[0]?.subscribed || 0)
    },
    events: {
      total: parseInt(eventStats.rows[0]?.total || 0),
      upcoming: parseInt(eventStats.rows[0]?.upcoming || 0)
    },
    messages: {
      byStatus: messageStats.rows.reduce((acc, row) => {
        acc[row.status] = parseInt(row.count)
        return acc
      }, {}),
      last7Days: recentMessages.rows
    },
    optOuts: {
      last30Days: parseInt(optOuts.rows[0]?.total || 0)
    },
    timestamp: new Date().toISOString()
  }
}

export const getRecentActivity = async (limit = 50) => {
  const activity = await query(
    `
    SELECT 
      m.id,
      m.message_text,
      m.status,
      m.sent_time,
      m.error,
      v.name as visitor_name,
      v.phone_number,
      e.title as event_title
    FROM messages m
    LEFT JOIN visitors v ON m.visitor_id = v.id
    LEFT JOIN events e ON m.event_id = e.id
    ORDER BY m.sent_time DESC
    LIMIT $1
    `,
    [limit]
  )

  return activity.rows
}

export const getVisitorEngagement = async () => {
  const engagement = await query(`
    SELECT 
      v.id,
      v.name,
      v.phone_number,
      v.first_visit_date,
      v.last_attendance,
      COUNT(m.id) as messages_received,
      MAX(m.sent_time) as last_message_sent
    FROM visitors v
    LEFT JOIN messages m ON v.id = m.visitor_id
    WHERE v.is_subscribed = true
    GROUP BY v.id, v.name, v.phone_number, v.first_visit_date, v.last_attendance
    ORDER BY messages_received DESC
    LIMIT 100
  `)

  return engagement.rows
}
