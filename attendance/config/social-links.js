const DEFAULT_SOCIAL_LINKS = [
  {
    key: 'facebook',
    label: 'Facebook',
    targetUrl: 'https://web.facebook.com/profile.php?id=61587147628624',
    envVar: 'SOCIAL_LINK_FACEBOOK'
  },
  {
    key: 'instagram',
    label: 'Instagram',
    targetUrl: 'https://www.instagram.com/theupperroom_4sq/',
    envVar: 'SOCIAL_LINK_INSTAGRAM'
  },
  {
    key: 'youtube',
    label: 'YouTube',
    targetUrl: 'https://youtube.com/@theupperroom_4sq?si=mDSHkd21JpLiDmwC',
    envVar: 'SOCIAL_LINK_YOUTUBE'
  },
  {
    key: 'x',
    label: 'X',
    targetUrl: 'https://x.com/Upperroom_4sq',
    envVar: 'SOCIAL_LINK_X'
  },
  {
    key: 'tiktok',
    label: 'TikTok',
    targetUrl: 'https://tiktok.com/@theupperroom_4sq',
    envVar: 'SOCIAL_LINK_TIKTOK'
  }
]

const resolveSocialLink = (link) => {
  const envValue = String(process.env[link.envVar] || '').trim()
  const targetUrl = envValue || link.targetUrl
  return {
    key: link.key,
    label: link.label,
    targetUrl
  }
}

export const listSocialLinks = () => {
  return DEFAULT_SOCIAL_LINKS.map(resolveSocialLink).filter((link) => link.targetUrl)
}

export const getSocialLinkByKey = (socialKey) => {
  const key = String(socialKey || '').trim().toLowerCase()
  return listSocialLinks().find((link) => link.key === key) || null
}
