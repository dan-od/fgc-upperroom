import { toApiUrl } from './appPaths'

const parseJson = async (response) => {
  const data = await response.json().catch(() => ({}))
  return { ok: response.ok, status: response.status, data }
}

export const fetchLiveStatus = async () => {
  const response = await fetch(toApiUrl('/api/live/status'))
  const parsed = await parseJson(response)
  if (!parsed.ok) {
    const error = new Error(parsed.data?.error || 'Unable to load live status.')
    error.status = parsed.status
    throw error
  }
  return parsed.data
}

export const fetchVodFeed = async ({ limit = 12 } = {}) => {
  const safeLimit = Math.max(1, Math.min(24, Math.round(Number(limit) || 12)) )
  const response = await fetch(toApiUrl(`/api/vod?limit=${safeLimit}`))
  const parsed = await parseJson(response)
  if (!parsed.ok) {
    const error = new Error(parsed.data?.error || 'Unable to load VOD feed.')
    error.status = parsed.status
    throw error
  }
  return parsed.data
}
