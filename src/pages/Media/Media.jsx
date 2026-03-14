import { useState, useEffect, useMemo } from 'react'
import {
  Camera,
  Heart,
  Play,
  Headphones,
  Church,
  Users,
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { SectionHeader } from '../../components/common'
import { mediaItems } from './mediaData'
import {
  DEFAULT_MEDIA_THUMBNAIL,
  extractYouTubeId,
  normalizeTitleKey,
  readAdminMediaItems
} from '../../utils/mediaStorage'
import './Media.css'

const ITEMS_PER_PAGE = 6

const CATEGORIES = [
  { id: 'all', label: 'All Content', icon: Camera },
  { id: 'youth', label: 'Youth Focus', icon: Heart },
  { id: 'sermons', label: 'Sermons', icon: Play },
  { id: 'audio', label: 'Audio/Music', icon: Headphones },
  { id: 'worship', label: 'Worship', icon: Church },
  { id: 'community', label: 'Community', icon: Users },
  { id: 'events', label: 'Events', icon: Calendar }
]

const DATE_FILTERS = [
  { id: 'all', label: 'All Time' },
  { id: 'thisMonth', label: 'This Month' },
  { id: 'last3Months', label: 'Last 3 Months' },
  { id: 'thisYear', label: 'This Year' }
]

const getItemFilterCategory = (item) => {
  const category = String(item.category || '').toLowerCase()

  if (category === 'audio' || item.type === 'audio') {
    return 'audio'
  }

  if (category === 'sermons') {
    return 'sermons'
  }

  if (category === 'youth') {
    return 'youth'
  }

  if (category === 'worship') {
    return 'worship'
  }

  if (category === 'community') {
    return 'community'
  }

  if (category === 'events') {
    return 'events'
  }

  if (item.type === 'video') {
    return 'sermons'
  }

  return 'community'
}

const getItemLabel = (item) => {
  const category = item.category.toLowerCase()

  if (category === 'sermons') {
    return 'Sermon'
  }

  if (item.type === 'video') {
    return 'Video'
  }

  if (item.type === 'audio' || category === 'audio') {
    return 'Audio'
  }

  if (category === 'events') {
    return 'Event'
  }

  return 'Photo'
}

const getItemIcon = (item) => {
  const category = String(item.category || '').toLowerCase()

  if (category === 'audio' || item.type === 'audio') {
    return Headphones
  }

  if (category === 'sermons') {
    return Play
  }

  if (category === 'youth') {
    return Heart
  }

  if (category === 'worship') {
    return Church
  }

  if (category === 'community') {
    return Users
  }

  if (category === 'events') {
    return Calendar
  }

  if (item.type === 'video') {
    return Play
  }

  return Camera
}

const toSafeTimestamp = (value) => {
  const parsedNumber = Number(value)
  if (Number.isFinite(parsedNumber) && parsedNumber > 0) {
    return parsedNumber
  }

  const parsedDate = new Date(value)
  if (!Number.isNaN(parsedDate.getTime())) {
    return parsedDate.getTime()
  }

  return Date.now()
}

const toMediaAssetList = (item) => {
  const normalizeAsset = (asset, index = 0) => {
    const inferredType = asset?.type || (asset?.audioUrl ? 'audio' : asset?.videoUrl ? 'video' : 'image')
    const videoSource = String(asset?.videoUrl || asset?.src || '')
    const youtubeId = inferredType === 'video' ? extractYouTubeId(videoSource) : null

    return {
      id: String(asset?.id || `${item.id}-asset-${index}`),
      type: inferredType,
      src:
        inferredType === 'image'
          ? String(asset?.src || asset?.thumbnail || '')
          : inferredType === 'video'
            ? youtubeId
              ? String(asset?.src || '')
              : String(asset?.src || videoSource || '')
            : String(asset?.src || ''),
      thumbnail: String(asset?.thumbnail || item.thumbnail || item.src || DEFAULT_MEDIA_THUMBNAIL),
      videoUrl: inferredType === 'video' && youtubeId ? `https://www.youtube.com/embed/${youtubeId}` : '',
      audioUrl: inferredType === 'audio' ? String(asset?.audioUrl || asset?.src || '') : '',
      alt: String(asset?.alt || item.alt || item.title || '')
    }
  }

  if (Array.isArray(item.media) && item.media.length > 0) {
    return item.media.map((asset, index) => normalizeAsset(asset, index))
  }

  if (item.type === 'video' || item.videoUrl) {
    return [
      normalizeAsset(
        {
          type: 'video',
          videoUrl: item.videoUrl,
          src: item.src,
          thumbnail: item.thumbnail || item.src,
          alt: item.alt || item.title
        },
        0
      )
    ]
  }

  if (item.type === 'audio' || item.audioUrl) {
    return [
      normalizeAsset(
        {
          type: 'audio',
          audioUrl: item.audioUrl || item.src,
          src: item.src,
          thumbnail: item.thumbnail || item.src,
          alt: item.alt || item.title
        },
        0
      )
    ]
  }

  return [
    normalizeAsset(
      {
        type: 'image',
        src: item.src || item.thumbnail,
        thumbnail: item.thumbnail || item.src,
        alt: item.alt || item.title
      },
      0
    )
  ]
}

const dedupeMediaAssets = (assets) => {
  const seen = new Set()

  return assets.filter((asset) => {
    const key = `${asset.type}:${asset.videoUrl || asset.audioUrl || asset.src || asset.thumbnail}`
    if (!key || seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}

const getSermonMergeKey = (item) => {
  const key = normalizeTitleKey(item.syncKey || item.mergeKey || item.title || item.id)
  return key || String(item.id)
}

const getSourceRank = (item) => {
  if (item.source === 'youtube') {
    return 3
  }
  if (item.source === 'admin') {
    return 2
  }
  if (item.source === 'static') {
    return 1
  }
  return 0
}

const firstNonEmpty = (values) => {
  return values.find((value) => String(value || '').trim()) || ''
}

const mergeSermonGroup = (group) => {
  const ordered = [...group].sort((a, b) => getSourceRank(b) - getSourceRank(a))
  const youtubeItem = ordered.find((item) => item.source === 'youtube')
  const adminItem = ordered.find((item) => item.source === 'admin')
  const lead = youtubeItem || adminItem || ordered[0]

  const media = dedupeMediaAssets(ordered.flatMap((item) => toMediaAssetList(item)))
  const leadAsset = media[0] || {}
  const mergedTimestamp = Math.max(...ordered.map((item) => toSafeTimestamp(item.timestamp || item.date)))

  return {
    ...lead,
    id: String(youtubeItem?.id || lead.id),
    source: 'merged',
    type: leadAsset.type || lead.type || 'video',
    category: 'sermons',
    title: firstNonEmpty(ordered.map((item) => item.title)),
    description: firstNonEmpty([adminItem?.description, ...ordered.map((item) => item.description)]) || 'Sunday sermon',
    speaker: firstNonEmpty([adminItem?.speaker, ...ordered.map((item) => item.speaker)]),
    keypoint: firstNonEmpty([adminItem?.keypoint, ...ordered.map((item) => item.keypoint)]),
    mergeKey: getSermonMergeKey(lead),
    timestamp: mergedTimestamp,
    date: lead.date || new Date(mergedTimestamp).toISOString().slice(0, 10),
    media,
    thumbnail: leadAsset.thumbnail || lead.thumbnail || lead.src || DEFAULT_MEDIA_THUMBNAIL,
    src: leadAsset.src || leadAsset.thumbnail || lead.src || lead.thumbnail || DEFAULT_MEDIA_THUMBNAIL,
    videoUrl: leadAsset.videoUrl || lead.videoUrl || '',
    audioUrl: leadAsset.audioUrl || lead.audioUrl || ''
  }
}

const Media = () => {
  const [activeCategory, setActiveCategory] = useState('all')
  const [activeDateFilter, setActiveDateFilter] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [apiSermons, setApiSermons] = useState([])
  const [adminMediaItems, setAdminMediaItems] = useState([])
  const [setupRequired, setSetupRequired] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedMedia, setSelectedMedia] = useState(null)
  const [selectedAssetIndex, setSelectedAssetIndex] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [touchStart, setTouchStart] = useState(0)

  useEffect(() => {
    const hydrateAdminMedia = () => {
      setAdminMediaItems(readAdminMediaItems())
    }

    hydrateAdminMedia()
    window.addEventListener('storage', hydrateAdminMedia)
    window.addEventListener('focus', hydrateAdminMedia)

    return () => {
      window.removeEventListener('storage', hydrateAdminMedia)
      window.removeEventListener('focus', hydrateAdminMedia)
    }
  }, [])

  useEffect(() => {
    const fetchSermons = async () => {
      try {
        const response = await fetch('/api/sermons')
        if (!response.ok) {
          setApiSermons([])
          return
        }

        const payload = await response.json()
        if (payload?.setupRequired) {
          setSetupRequired(true)
          setApiSermons([])
          return
        }

        if (!Array.isArray(payload?.data)) {
          setApiSermons([])
          return
        }

        setSetupRequired(false)

        const mappedSermons = payload.data
          .filter((item) => item?.title && (item?.videoUrl || item?.url))
          .map((item) => {
            const videoUrl = item.videoUrl || item.url
            const parsedTimestamp = Number(item.timestamp)
            const safeTimestamp = Number.isFinite(parsedTimestamp)
              ? parsedTimestamp
              : new Date(item.date || item.publishedAt || Date.now()).getTime()

            return {
              id: String(item.id || `sermon-${safeTimestamp}`),
              type: 'video',
              title: item.title,
              category: 'sermons',
              source: 'youtube',
              mergeKey: normalizeTitleKey(item.syncKey || item.mergeKey || item.title),
              description: item.description || 'Sunday sermon',
              date: item.date || new Date(safeTimestamp).toISOString().slice(0, 10),
              timestamp: safeTimestamp,
              speaker: item.speaker,
              keypoint: item.keypoint,
              thumbnail: item.thumbnail || DEFAULT_MEDIA_THUMBNAIL,
              src: item.thumbnail || DEFAULT_MEDIA_THUMBNAIL,
              videoUrl,
              media: [
                {
                  id: `${item.id || `sermon-${safeTimestamp}`}-youtube`,
                  type: 'video',
                  videoUrl,
                  src: '',
                  thumbnail: item.thumbnail || DEFAULT_MEDIA_THUMBNAIL,
                  alt: item.title
                }
              ],
              alt: item.title
            }
          })

        setApiSermons(mappedSermons)
      } catch {
        setApiSermons([])
      }
    }

    fetchSermons()
  }, [])

  const allMediaItems = useMemo(() => {
    const staticItems = mediaItems.map((item) => ({
      ...item,
      source: 'static',
      mergeKey: normalizeTitleKey(item.syncKey || item.mergeKey || item.title)
    }))
    const adminItems = adminMediaItems.map((item) => ({
      ...item,
      source: 'admin',
      mergeKey: normalizeTitleKey(item.syncKey || item.mergeKey || item.title)
    }))

    const merged = [...staticItems, ...adminItems, ...apiSermons]

    const sermonItems = merged.filter((item) => getItemFilterCategory(item) === 'sermons')
    const nonSermonItems = merged.filter((item) => getItemFilterCategory(item) !== 'sermons')

    const groupedSermons = sermonItems.reduce((map, item) => {
      const key = getSermonMergeKey(item)
      if (!map.has(key)) {
        map.set(key, [])
      }
      map.get(key).push(item)
      return map
    }, new Map())

    const mergedSermons = Array.from(groupedSermons.values()).map((group) => mergeSermonGroup(group))

    const uniqueNonSermons = nonSermonItems.filter((item, index, list) => {
      return list.findIndex((candidate) => String(candidate.id) === String(item.id)) === index
    })

    return [...uniqueNonSermons, ...mergedSermons]
      .sort((a, b) => toSafeTimestamp(b.timestamp) - toSafeTimestamp(a.timestamp))
  }, [apiSermons, adminMediaItems])

  const filteredMediaItems = useMemo(() => {
    const now = Date.now()

    return allMediaItems.filter((item) => {
      const categoryMatch = activeCategory === 'all'
        ? true
        : getItemFilterCategory(item) === activeCategory

      if (!categoryMatch) {
        return false
      }

      const itemTime = Number(item.timestamp)

      if (activeDateFilter === 'all') {
        return true
      }

      if (activeDateFilter === 'thisMonth') {
        return itemTime >= now - (30 * 24 * 60 * 60 * 1000)
      }

      if (activeDateFilter === 'last3Months') {
        return itemTime >= now - (90 * 24 * 60 * 60 * 1000)
      }

      if (activeDateFilter === 'thisYear') {
        const yearStart = new Date(new Date().getFullYear(), 0, 1).getTime()
        return itemTime >= yearStart
      }

      if (activeDateFilter === 'custom') {
        if (!startDate && !endDate) {
          return true
        }

        const from = startDate ? new Date(startDate).getTime() : -Infinity
        const to = endDate
          ? new Date(`${endDate}T23:59:59`).getTime()
          : Infinity

        return itemTime >= from && itemTime <= to
      }

      return true
    })
  }, [allMediaItems, activeCategory, activeDateFilter, startDate, endDate])

  useEffect(() => {
    setCurrentPage(1)
  }, [filteredMediaItems, activeCategory])

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredMediaItems.length / ITEMS_PER_PAGE)),
    [filteredMediaItems.length]
  )

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    const endIndex = startIndex + ITEMS_PER_PAGE
    return filteredMediaItems.slice(startIndex, endIndex)
  }, [filteredMediaItems, currentPage])

  useEffect(() => {
    document.body.style.overflow = showModal ? 'hidden' : 'auto'
    return () => {
      document.body.style.overflow = 'auto'
    }
  }, [showModal])

  useEffect(() => {
    if (!showModal || !selectedMedia) {
      return
    }

    const existsInView = filteredMediaItems.some((item) => item.id === selectedMedia.id)
    if (!existsInView) {
      setShowModal(false)
      setSelectedMedia(null)
    }
  }, [filteredMediaItems, showModal, selectedMedia])

  const goToPrevPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1))
  }

  const goToNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
  }

  const openLightbox = (media) => {
    setSelectedMedia(media)
    setSelectedAssetIndex(0)
    setShowModal(true)
  }

  const closeLightbox = () => {
    setShowModal(false)
    setSelectedMedia(null)
    setSelectedAssetIndex(0)
  }

  const selectedMediaAssets = useMemo(() => {
    if (!selectedMedia) {
      return []
    }

    if (Array.isArray(selectedMedia.media) && selectedMedia.media.length > 0) {
      return selectedMedia.media
    }

    return [selectedMedia]
  }, [selectedMedia])

  const activeLightboxAsset = selectedMediaAssets[selectedAssetIndex] || selectedMedia
  const showAssetSelector = Boolean(
    selectedMedia &&
    getItemFilterCategory(selectedMedia) !== 'audio' &&
    selectedMediaAssets.length > 1
  )

  const getCurrentIndex = () => filteredMediaItems.findIndex((item) => item.id === selectedMedia?.id)

  const goToNext = () => {
    if (!filteredMediaItems.length || !selectedMedia) {
      return
    }

    const currentIndex = getCurrentIndex()
    const nextIndex = (currentIndex + 1) % filteredMediaItems.length
    setSelectedMedia(filteredMediaItems[nextIndex])
    setSelectedAssetIndex(0)
  }

  const goPrev = () => {
    if (!filteredMediaItems.length || !selectedMedia) {
      return
    }

    const currentIndex = getCurrentIndex()
    const prevIndex = currentIndex === 0 ? filteredMediaItems.length - 1 : currentIndex - 1
    setSelectedMedia(filteredMediaItems[prevIndex])
    setSelectedAssetIndex(0)
  }

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!showModal) return
      if (e.key === 'Escape') closeLightbox()
      if (e.key === 'ArrowRight') goToNext()
      if (e.key === 'ArrowLeft') goPrev()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showModal, selectedMedia])

  const handleTouchStart = (e) => {
    setTouchStart(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = (e) => {
    const swipeDistance = touchStart - e.changedTouches[0].clientX
    const minSwipeDistance = 50

    if (Math.abs(swipeDistance) > minSwipeDistance) {
      if (swipeDistance > 0) {
        goToNext() // Swiped left → next
      } else {
        goPrev() // Swiped right → prev
      }
    }
  }

  const marqueeEvenItems = useMemo(
    () => filteredMediaItems.filter((_, index) => index % 2 === 0),
    [filteredMediaItems]
  )

  const marqueeOddItems = useMemo(
    () => filteredMediaItems.filter((_, index) => index % 2 !== 0),
    [filteredMediaItems]
  )

  const MediaCard = ({ media, onCardClick, showIcon = false, isMarquee = false }) => {
    const [currentMediaIndex, setCurrentMediaIndex] = useState(0)
    const hasMultipleMedia = media.media && media.media.length > 1
    const mediaArray = media.media || [media]
    const currentMedia = mediaArray[currentMediaIndex]

    const handlePrevMedia = (e) => {
      e.stopPropagation()
      setCurrentMediaIndex((prev) => (prev === 0 ? mediaArray.length - 1 : prev - 1))
    }

    const handleNextMedia = (e) => {
      e.stopPropagation()
      setCurrentMediaIndex((prev) => (prev === mediaArray.length - 1 ? 0 : prev + 1))
    }

    const getThumbnail = () => currentMedia.thumbnail || media.thumbnail
    const getMediaType = () => currentMedia.type || media.type

    return (
      <div
        className={`group relative gallery-item ${isMarquee ? 'marquee-card' : ''}`.trim()}
        onClick={onCardClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            onCardClick()
          }
        }}
      >
        <img
          src={getThumbnail()}
          alt={currentMedia.alt || media.alt}
          className="gallery-image"
          loading="lazy"
        />
        {showIcon && (
          <div className="icon-overlay">
            {(() => {
              const IconComponent = getItemIcon({ ...media, type: getMediaType() })
              return <IconComponent size={48} className="text-white fill-white" />
            })()}
          </div>
        )}
        {hasMultipleMedia && (
          <>
            <button
              className="media-nav-btn media-nav-prev"
              onClick={handlePrevMedia}
              aria-label="Previous media"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              className="media-nav-btn media-nav-next"
              onClick={handleNextMedia}
              aria-label="Next media"
            >
              <ChevronRight size={20} />
            </button>
            <div className="media-indicators">
              {mediaArray.map((_, idx) => (
                <button
                  key={idx}
                  className={`media-dot ${idx === currentMediaIndex ? 'active' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    setCurrentMediaIndex(idx)
                  }}
                  aria-label={`Go to media ${idx + 1}`}
                />
              ))}
            </div>
          </>
        )}
        <div className="gallery-overlay">
          <div className="gallery-content">
            <span className="media-badge">{getItemLabel(media)}</span>
            <h3 className="gallery-title">{media.title}</h3>
            <p className="gallery-date">{new Date(media.timestamp).toLocaleDateString()}</p>
            {media.speaker && <p className="gallery-meta">Speaker: {media.speaker}</p>}
          </div>
        </div>
      </div>
    )
  }

  const MarqueeRow = ({ items, direction = 'left', speed = 60 }) => {
    if (!items.length) {
      return null
    }

    const marqueeItems = [...items, ...items, ...items]
    const marqueeX = direction === 'left'
      ? ['0%', '-33.333%']
      : ['-33.333%', '0%']

    return (
      <div className="marquee-row">
        <motion.div
          className="marquee-track"
          animate={{ x: marqueeX }}
          transition={{ duration: speed, repeat: Infinity, ease: 'linear' }}
        >
          {marqueeItems.map((media, index) => (
            <MediaCard
              key={`${media.id}-${index}`}
              media={media}
              onCardClick={() => openLightbox(media)}
              showIcon={true}
              isMarquee={true}
            />
          ))}
        </motion.div>
      </div>
    )
  }

  return (
    <main className="media-page">
      <section className="page-banner bg-purple">
        <div className="container">
          <h1>Media</h1>
          <p>Photos, videos, and sermons</p>
        </div>
      </section>

      <section className="media-section">
        <div className="container">
          <SectionHeader tag="Gallery" title="Our Moments" subtitle="Capturing God's work in our midst" />

          <div className="media-filters-shell">
            <div className="category-filters">
              {CATEGORIES.map((category) => {
                const Icon = category.icon

                return (
                <button
                  key={category.id}
                  className={`filter-btn ${activeCategory === category.id ? 'active' : ''}`}
                  onClick={() => setActiveCategory(category.id)}
                >
                  <Icon className="filter-icon" size={16} strokeWidth={1.8} aria-hidden="true" />
                  <span>{category.label}</span>
                </button>
                )
              })}
            </div>

            <div className="date-filter-row" role="group" aria-label="Date filters">
              <div className="date-filters">
                <Clock className="date-filter-clock" size={15} strokeWidth={1.8} aria-hidden="true" />
                {DATE_FILTERS.map((filter) => (
                  <button
                    key={filter.id}
                    className={`filter-btn filter-btn--date ${activeDateFilter === filter.id ? 'active' : ''}`}
                    onClick={() => {
                      setActiveDateFilter(filter.id)
                      setStartDate('')
                      setEndDate('')
                    }}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              <div className="date-divider" aria-hidden="true" />

              <div className="manual-date-range">
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => {
                    setStartDate(event.target.value)
                    setActiveDateFilter('custom')
                  }}
                  aria-label="Start date"
                />
                <span className="manual-separator" aria-hidden="true">–</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(event) => {
                    setEndDate(event.target.value)
                    setActiveDateFilter('custom')
                  }}
                  aria-label="End date"
                />
                {(startDate || endDate) && (
                  <button
                    className="filter-btn filter-btn--clear"
                    onClick={() => {
                      setStartDate('')
                      setEndDate('')
                      setActiveDateFilter('all')
                    }}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          {activeCategory === 'sermons' && setupRequired && (
            <p className="end-message">YouTube setup required to sync sermons. Add API key and channel ID to environment.</p>
          )}

          {activeCategory === 'all' ? (
            <>
              {filteredMediaItems.length > 0 ? (
                <div className="marquee-stack mask-fade-x">
                  <MarqueeRow items={marqueeEvenItems} direction="left" speed={50} />
                  <MarqueeRow items={marqueeOddItems} direction="right" speed={60} />
                </div>
              ) : (
                <div className="lazy-load-trigger">
                  <p className="end-message">No media found in this category</p>
                </div>
              )}
            </>
          ) : (
            <>
              <motion.div className="gallery-grid">
                <AnimatePresence mode="popLayout">
                  {paginatedItems.map((media) => (
                    <motion.div
                      key={media.id}
                      layout="position"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ 
                        duration: 0.3,
                        ease: "easeOut"
                      }}
                    >
                      <MediaCard
                        media={media}
                        onCardClick={() => openLightbox(media)}
                        showIcon={false}
                        isMarquee={false}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>

              {filteredMediaItems.length > 0 ? (
                <div className="pagination-controls" role="navigation" aria-label="Media pagination">
                  <button
                    className="pagination-btn"
                    onClick={goToPrevPage}
                    disabled={currentPage === 1}
                    aria-label="Previous page"
                  >
                    Previous
                  </button>
                  <p className="pagination-info">
                    Page {currentPage} of {totalPages}
                  </p>
                  <button
                    className="pagination-btn"
                    onClick={goToNextPage}
                    disabled={currentPage === totalPages}
                    aria-label="Next page"
                  >
                    Next
                  </button>
                </div>
              ) : (
                <div className="lazy-load-trigger">
                  <p className="end-message">No media found in this category</p>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <AnimatePresence>
        {showModal && selectedMedia && (
          <motion.div
            className="lightbox-modal"
            onClick={closeLightbox}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="lightbox-container"
              onClick={(e) => e.stopPropagation()}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
            <button
              className="lightbox-close"
              onClick={closeLightbox}
              aria-label="Close lightbox"
              title="Close (Esc)"
            >
              ✕
            </button>

            <div className="lightbox-media">
              {activeLightboxAsset?.type === 'video' ? (
                (() => {
                  const source = activeLightboxAsset.videoUrl ||
                    activeLightboxAsset.src ||
                    selectedMedia.videoUrl ||
                    selectedMedia.src
                  const youtubeId = extractYouTubeId(source)

                  if (youtubeId) {
                    return (
                      <motion.iframe
                        key={`${selectedMedia.id}-asset-${selectedAssetIndex}-youtube`}
                        src={`https://www.youtube.com/embed/${youtubeId}`}
                        className="lightbox-iframe"
                        title={selectedMedia.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        initial={{ opacity: 0, scale: 0.97, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.97, y: -10 }}
                      />
                    )
                  }

                  return (
                    <motion.video
                      key={`${selectedMedia.id}-asset-${selectedAssetIndex}-video-file`}
                      src={source}
                      className="lightbox-video"
                      controls
                      poster={activeLightboxAsset.thumbnail || selectedMedia.thumbnail || DEFAULT_MEDIA_THUMBNAIL}
                      initial={{ opacity: 0, scale: 0.97, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.97, y: -10 }}
                    />
                  )
                })()
              ) : activeLightboxAsset?.type === 'audio' ? (
                <motion.div
                  key={`${selectedMedia.id}-asset-${selectedAssetIndex}-audio`}
                  className="lightbox-audio-shell"
                  initial={{ opacity: 0, scale: 0.97, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97, y: -10 }}
                >
                  <img src={activeLightboxAsset.thumbnail || activeLightboxAsset.src || selectedMedia.thumbnail || selectedMedia.src} alt={activeLightboxAsset.alt || selectedMedia.alt} className="lightbox-audio-cover" />
                  <audio className="lightbox-audio" controls src={activeLightboxAsset.audioUrl || activeLightboxAsset.src || selectedMedia.audioUrl || selectedMedia.src}>
                    Your browser does not support the audio element.
                  </audio>
                </motion.div>
              ) : (
                <motion.img
                  key={`${selectedMedia.id}-asset-${selectedAssetIndex}-image`}
                  src={activeLightboxAsset?.src || activeLightboxAsset?.thumbnail || selectedMedia.src}
                  alt={activeLightboxAsset?.alt || selectedMedia.alt}
                  className="lightbox-image"
                  initial={{ opacity: 0, scale: 0.97, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97, y: -10 }}
                />
              )}
            </div>

            {showAssetSelector && (
              <div className="lightbox-media-selector" role="group" aria-label="Select media within this card">
                {selectedMediaAssets.map((_, index) => (
                  <button
                    key={`${selectedMedia.id}-asset-btn-${index}`}
                    className={`lightbox-media-index-btn ${index === selectedAssetIndex ? 'active' : ''}`}
                    onClick={() => setSelectedAssetIndex(index)}
                    aria-label={`Open media ${index + 1}`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
            )}

            <motion.div
              className="lightbox-info"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 }}
            >
              <h2>{selectedMedia.title}</h2>
              <p>{new Date(selectedMedia.timestamp).toLocaleDateString()} • {getItemLabel(selectedMedia)}</p>
              {selectedMedia.speaker && <p>Speaker: {selectedMedia.speaker}</p>}
            </motion.div>

            {selectedMedia.keypoint && (
              <div className="lightbox-keypoint">
                <h3>Key Point</h3>
                <p>{selectedMedia.keypoint}</p>
              </div>
            )}

            {selectedMedia.description && (
              <p className="lightbox-description">{selectedMedia.description}</p>
            )}

            <div className="lightbox-bottom-nav" role="group" aria-label="Media navigation controls">
              <button
                className="lightbox-step-btn"
                onClick={goPrev}
                aria-label="Go to previous media"
              >
                ← Previous
              </button>
              <button
                className="lightbox-step-btn"
                onClick={goToNext}
                aria-label="Go to next media"
              >
                Next →
              </button>
            </div>

            <button
              className="lightbox-nav lightbox-prev"
              onClick={goPrev}
              aria-label="Previous media"
              title="Previous (← arrow)"
            >
              ❮
            </button>
            <button
              className="lightbox-nav lightbox-next"
              onClick={goToNext}
              aria-label="Next media"
              title="Next (→ arrow)"
            >
              ❯
            </button>

            <div className="lightbox-counter">
              {Math.max(getCurrentIndex() + 1, 1)} / {filteredMediaItems.length}
            </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}

export default Media
