export type Category = 'All' | 'Devotionals' | 'Sunday School' | 'Articles' | 'Blog Posts'

export interface BlogPost {
  id: string
  title: string
  excerpt: string
  content: string
  author: string
  date: string
  category: Category
  imageUrl: string
  readTime: string
}
