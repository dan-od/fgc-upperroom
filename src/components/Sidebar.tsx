import React from 'react'
import { Search, BookOpen, Users, FileText, MessageSquare, LayoutGrid } from 'lucide-react'
import type { Category } from '../types'

interface SidebarProps {
  selectedCategory: Category
  onSelectCategory: (category: Category) => void
  searchQuery: string
  onSearchChange: (query: string) => void
  onSubscribe?: () => void
}

const categories: { name: Category; icon: React.ElementType }[] = [
  { name: 'All', icon: LayoutGrid },
  { name: 'Devotionals', icon: BookOpen },
  { name: 'Sunday School', icon: Users },
  { name: 'Articles', icon: FileText },
  { name: 'Blog Posts', icon: MessageSquare }
]

export const Sidebar: React.FC<SidebarProps> = ({
  selectedCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  onSubscribe
}) => {
  const handleSubscribe = () => {
    if (typeof onSubscribe === 'function') {
      onSubscribe()
    }
  }

  return (
    <aside className="blog-filter-sidebar" aria-label="Blog filters">
      <div className="blog-filter-sticky">
        <div className="blog-search-wrap">
          <Search className="blog-search-icon" size={16} />
          <input
            type="text"
            placeholder="Search title, topic, author, or date..."
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            className="blog-search-input"
            aria-label="Search blog posts"
          />
        </div>

        <nav className="blog-category-nav" aria-label="Blog categories">
          <h3>Categories</h3>
          {categories.map((category) => {
            const Icon = category.icon
            const isActive = selectedCategory === category.name

            return (
              <button
                key={category.name}
                type="button"
                onClick={() => onSelectCategory(category.name)}
                className={`blog-category-button ${isActive ? 'is-active' : ''}`}
              >
                <span className="blog-category-button__left">
                  <Icon size={16} />
                  <span>{category.name}</span>
                </span>
                {isActive && <span className="blog-category-button__dot" />}
              </button>
            )
          })}
        </nav>

        <section className="blog-subscribe-box">
          <h4>Weekly Wisdom</h4>
          <p>Get our latest devotionals and church updates delivered to your inbox.</p>
          <button type="button" onClick={handleSubscribe}>
            Subscribe
          </button>
        </section>
      </div>
    </aside>
  )
}
