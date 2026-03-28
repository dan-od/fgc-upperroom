import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/common'
import { fetchLiveStatus, fetchVodFeed } from '../../utils/liveApi'
import { useI18n } from '../../i18n/LanguageContext'
import './Live.css'

const formatDate = (value, locale = 'en-US') => {
  const date = new Date(String(value || ''))
  if (Number.isNaN(date.getTime())) return '--'
  return date.toLocaleDateString(locale, { month: 'long', day: 'numeric', year: 'numeric' })
}

const Live = () => {
  const { t, language } = useI18n()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [liveStatus, setLiveStatus] = useState(null)
  const [vod, setVod] = useState([])
  const locale = language === 'pcm' ? 'en-NG' : 'en-US'

  useEffect(() => {
    let active = true

    const load = async ({ silent = false } = {}) => {
      if (!silent) setLoading(true)
      setError('')

      try {
        const [statusPayload, vodPayload] = await Promise.all([
          fetchLiveStatus(),
          fetchVodFeed({ limit: 6 })
        ])

        if (!active) return
        setLiveStatus(statusPayload || null)
        setVod(Array.isArray(vodPayload?.data) ? vodPayload.data : [])
      } catch (err) {
        if (!active) return
        setError(err?.message || t('live.errorFallback', 'Unable to load live stream details right now.'))
      } finally {
        if (active) setLoading(false)
      }
    }

    void load({ silent: false })
    const poller = window.setInterval(() => {
      void load({ silent: true })
    }, 60000)

    return () => {
      active = false
      window.clearInterval(poller)
    }
  }, [t])

  const liveVideo = liveStatus?.stream || null
  const latestVideo = useMemo(() => liveStatus?.latest || vod[0] || null, [liveStatus, vod])
  const setupRequired = Boolean(liveStatus?.setupRequired)

  return (
    <main id="main-content" className="live-page">
      <section className="live-page__hero">
        <div className="container live-page__hero-inner">
          <p className="live-page__eyebrow">{t('live.heroEyebrow', 'Live + On Demand')}</p>
          <h1>{t('live.heroTitle', 'Worship Live. Watch Anytime.')}</h1>
          <p>
            {t(
              'live.heroSubtitle',
              'Join Sunday service live when broadcast is active. When we are offline, catch up with the latest message and recent sermons on demand.'
            )}
          </p>
        </div>
      </section>

      <section className="live-page__section">
        <div className="container live-page__grid">
          <article className="live-page__panel live-page__panel--primary">
            {loading ? <p className="live-page__status">{t('live.loading', 'Loading live stream status...')}</p> : null}
            {error ? <p className="live-page__status live-page__status--error">{error}</p> : null}
            {setupRequired ? <p className="live-page__status">{t('live.setupRequired', 'YouTube integration needs setup in environment variables.')}</p> : null}

            {!loading && !error && !setupRequired ? (
              <>
                {liveStatus?.isLive && liveVideo?.videoUrl ? (
                  <div className="live-page__embed-wrap">
                    <iframe
                      title={liveVideo.title || t('live.iframeTitleFallback', 'Live stream')}
                      src={liveVideo.videoUrl}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                    <div className="live-page__live-pill">{t('live.liveNow', 'Live Now')}</div>
                  </div>
                ) : (
                  <div className="live-page__offline-card">
                    <p className="live-page__offline-label">{t('live.offlineLabel', 'We are offline right now')}</p>
                    <h2>{t('live.nextService', 'Next Service: Sunday, 8:00 AM (WAT)')}</h2>
                    <p>{t('live.offlineHint', 'Come back at service time, or watch the latest sermon while you wait.')}</p>
                    <div className="live-page__offline-actions">
                      <Button href={latestVideo?.watchUrl || '/media'} variant="secondary" size="md" external={Boolean(latestVideo?.watchUrl)} target={latestVideo?.watchUrl ? '_blank' : undefined} rel={latestVideo?.watchUrl ? 'noopener noreferrer' : undefined}>
                        {t('live.watchLatestSermon', 'Watch Latest Sermon')}
                      </Button>
                      <Button href="/media" variant="outline" size="md">{t('live.openMediaArchive', 'Open Media Archive')}</Button>
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </article>

          <aside className="live-page__panel live-page__panel--sidebar">
            <h2>{t('live.latestVideo', 'Latest Video')}</h2>
            {!latestVideo ? <p className="live-page__status">{t('live.noVideo', 'No video available yet.')}</p> : null}
            {latestVideo ? (
              <div className="live-page__latest-card">
                <img src={latestVideo.url} alt={latestVideo.title || t('live.latestSermonAlt', 'Latest sermon')} />
                <h3>{latestVideo.title}</h3>
                <p>{formatDate(latestVideo.publishedAt, locale)}</p>
                <Button href={latestVideo.watchUrl || '/media'} variant="primary" size="sm" external={Boolean(latestVideo.watchUrl)} target={latestVideo.watchUrl ? '_blank' : undefined} rel={latestVideo.watchUrl ? 'noopener noreferrer' : undefined}>
                  {t('live.watchNow', 'Watch Now')}
                </Button>
              </div>
            ) : null}

            <Link className="live-page__more-link" to="/media">{t('live.browseArchive', 'Browse full media archive')}</Link>
          </aside>
        </div>
      </section>

      <section className="live-page__section live-page__section--vod">
        <div className="container">
          <div className="live-page__vod-header">
            <h2>{t('live.recentSermons', 'Recent On-Demand Sermons')}</h2>
            <Link to="/media">{t('live.viewAll', 'View all')}</Link>
          </div>

          <div className="live-page__vod-grid">
            {vod.map((item) => (
              <article key={item.id} className="live-page__vod-card">
                <img src={item.url} alt={item.title || t('live.sermonCover', 'Sermon cover')} />
                <h3>{item.title}</h3>
                <p>{formatDate(item.publishedAt, locale)}</p>
                <a href={item.watchUrl} target="_blank" rel="noopener noreferrer">{t('live.watchOnYoutube', 'Watch on YouTube')}</a>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}

export default Live
