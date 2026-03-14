import React from 'react'
import { motion } from 'motion/react'
import { Calendar, User, ArrowRight, Clock, Download } from 'lucide-react'
import type { BlogPost } from '../types'

interface BlogCardProps {
  post: BlogPost
  onReadMore: (post: BlogPost) => void
  onDownloadMaterial: (post: BlogPost) => void
}

const formatPostDate = (value: string) => {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Unknown date'
  }

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

export const BlogCard: React.FC<BlogCardProps> = ({ post, onReadMore, onDownloadMaterial }) => {
  const isSundaySchool = post.category === 'Sunday School'

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="blog-feed-card"
    >
      <div className="blog-feed-card__image-wrap">
        <img
          src={post.imageUrl}
          alt={post.title}
          referrerPolicy="no-referrer"
          className="blog-feed-card__image"
          loading="lazy"
        />
        <span className="blog-feed-card__category">{post.category}</span>
      </div>

      <div className="blog-feed-card__content">
        <div className="blog-feed-card__meta">
          <span>
            <Calendar size={12} />
            {formatPostDate(post.date)}
          </span>
          <span>
            <Clock size={12} />
            {post.readTime}
          </span>
        </div>

        <h2>{post.title}</h2>

        <p>{post.excerpt}</p>

        <div className="blog-feed-card__footer">
          <div className="blog-feed-card__author">
            <span>
              <User size={14} />
            </span>
            <strong>{post.author}</strong>
          </div>

          <div className="blog-feed-card__actions">
            {isSundaySchool && (
              <button
                type="button"
                className="blog-feed-card__download"
                onClick={() => onDownloadMaterial(post)}
                aria-label={`Download ${post.title} material`}
                title="Download material"
              >
                <Download size={14} />
              </button>
            )}

            <button type="button" onClick={() => onReadMore(post)}>
              <span>Read More</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>
    </motion.article>
  )
}
