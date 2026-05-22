export const DEFAULT_LANGUAGE = 'en'

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'pcm', label: 'Naija Pidgin' }
]

export const messages = {
  en: {
    common: {
      loading: 'Loading...',
      skipToMainContent: 'Skip to main content'
    },
    header: {
      nav: {
        home: 'Home',
        about: 'About',
        team: 'Team',
        events: 'Events',
        live: 'Live',
        media: 'Media',
        giving: 'Giving',
        blog: 'Blog',
        contact: 'Contact'
      },
      primaryNavigation: 'Primary navigation',
      openMenu: 'Open menu',
      closeMenu: 'Close menu',
      closeBackdrop: 'Close menu',
      languageLabel: 'Language'
    },
    footer: {
      churchName: 'THE FOURSQUARE CHURCH',
      tagline: 'Raising Kingdom Youths!',
      description:
        'A vibrant youth church under the Foursquare Gospel Church, Mgbuoba Zonal HQ. Raising young people who know God and make Him known.',
      quickLinks: 'Quick Links',
      resources: 'Resources',
      serviceTimes: 'Service Times',
      firstSunday: '1st Sunday:',
      firstSundayTime: 'Communion Service - 7:30 AM',
      otherSundays: 'Other Sundays:',
      otherSundaysTime: 'Youth Service - 8:00 AM',
      wednesday: 'Wednesday:',
      wednesdayTime: '5:00 PM (Coming Soon)',
      emailUpdates: 'Get Updates',
      emailUpdatesDesc: 'Get event communication and ministry updates by WhatsApp, email, or both.',
      yourName: 'Your name',
      whatsappNumber: 'WhatsApp number',
      emailAddress: 'Email address',
      subscribe: 'Subscribe',
      saving: 'Saving...',
      languageLabel: 'Preferred Language',
      visitUs: 'Visit Us',
      addressTitle: 'Foursquare Gospel Church, Mgbuoba Zonal HQ',
      addressLine1: '36 Shell Location Road, Mgbuoba',
      addressLine2: 'Port Harcourt, Rivers State, Nigeria',
      scripture: '"Jesus Christ the same yesterday, and today, and forever."',
      rightsReserved: 'All rights reserved.',
      subscribeErrorMissing: 'Please enter your name and either WhatsApp number or email address.',
      subscribeErrorInvalidEmail: 'Enter a valid email address.',
      subscribeErrorInvalidPhone: 'Enter a valid WhatsApp number.',
      subscribeSuccessFallback: 'You are subscribed for updates.',
      subscribeErrorFallback: 'Unable to subscribe right now. Please try again shortly.'
    },
    home: {
      heroWelcome: 'Welcome to',
      heroTagline: 'Raising Kingdom Youths!',
      joinUs: 'Join Us',
      aboutUs: 'About Us',
      heroLiveCta: 'Watch Live',
      scroll: 'Scroll',
      newsletterTitle: 'Never Miss an Event',
      newsletterIntro:
        "Get personalized WhatsApp messages about upcoming events and weekly services. Never miss out on what's happening at Upper Room!",
      newsletterSuccessTitle: "You're In!",
      newsletterNamePlaceholder: 'Your Full Name',
      newsletterPhonePlaceholder: 'WhatsApp Number (e.g., +234 8123456789)',
      newsletterEmailPlaceholder: 'Your Email Address',
      newsletterSubmit: 'Subscribe & Get Updates',
      newsletterSubmitting: 'Subscribing...',
      closeNewsletterModal: 'Close newsletter sign-up modal',
      liveModalTitle: 'Live Service Stream',
      liveModalSubtitle: 'Join the broadcast right here without leaving this page.',
      liveModalLoading: 'Connecting to live stream...',
      liveModalError: 'Unable to load live stream right now.',
      liveModalOffline: 'We are not live at the moment.',
      liveModalFallback: 'Join directly on YouTube while we prepare the in-page stream.',
      liveModalOpenYoutube: 'Open on YouTube',
      closeLiveModal: 'Close live stream modal'
    },
    about: {
      bannerTitle: 'About Us',
      bannerSubtitle: 'Discover who we are and what we believe'
    },
    live: {
      errorFallback: 'Unable to load live stream details right now.',
      heroEyebrow: 'Live + On Demand',
      heroTitle: 'Worship Live. Watch Anytime.',
      heroSubtitle:
        'Join Sunday service live when broadcast is active. When we are offline, catch up with the latest message and recent sermons on demand.',
      loading: 'Loading live stream status...',
      setupRequired: 'YouTube integration needs setup in environment variables.',
      iframeTitleFallback: 'Live stream',
      liveNow: 'Live Now',
      offlineLabel: 'We are offline right now',
      nextService: 'Next Service: Sunday, 8:00 AM (WAT)',
      offlineHint: 'Come back at service time, or watch the latest sermon while you wait.',
      watchLatestSermon: 'Watch Latest Sermon',
      openMediaArchive: 'Open Media Archive',
      latestVideo: 'Latest Video',
      noVideo: 'No video available yet.',
      latestSermonAlt: 'Latest sermon',
      watchNow: 'Watch Now',
      browseArchive: 'Browse full media archive',
      recentSermons: 'Recent On-Demand Sermons',
      viewAll: 'View all',
      sermonCover: 'Sermon cover',
      watchOnYoutube: 'Watch on YouTube'
    }
  },
  pcm: {
    common: {
      loading: 'Dey load...',
      skipToMainContent: 'Jump go main content'
    },
    header: {
      nav: {
        home: 'Home',
        about: 'About Us',
        team: 'Our Team',
        events: 'Programs',
        live: 'Live',
        media: 'Media Hub',
        giving: 'Giving',
        blog: 'Stories',
        contact: 'Reach Us'
      },
      primaryNavigation: 'Main navigation',
      openMenu: 'Open menu',
      closeMenu: 'Close menu',
      closeBackdrop: 'Close menu',
      languageLabel: 'Language'
    },
    footer: {
      churchName: 'THE FOURSQUARE CHURCH',
      tagline: 'We dey raise kingdom youths!',
      description:
        'We be active youth church for Foursquare Gospel Church, Mgbuoba Zonal HQ. We dey raise young people wey sabi God and dey make am known.',
      quickLinks: 'Quick Links',
      resources: 'Resources',
      serviceTimes: 'Service Times',
      firstSunday: '1st Sunday:',
      firstSundayTime: 'Communion Service - 7:30 AM',
      otherSundays: 'Other Sundays:',
      otherSundaysTime: 'Youth Service - 8:00 AM',
      wednesday: 'Wednesday:',
      wednesdayTime: '5:00 PM (Coming Soon)',
      emailUpdates: 'Get Updates',
      emailUpdatesDesc: 'Get event gist and ministry updates for WhatsApp, email, or both.',
      yourName: 'Your name',
      whatsappNumber: 'WhatsApp number',
      emailAddress: 'Email address',
      subscribe: 'Subscribe',
      saving: 'Saving...',
      languageLabel: 'Language',
      visitUs: 'Visit Us',
      addressTitle: 'Foursquare Gospel Church, Mgbuoba Zonal HQ',
      addressLine1: '36 Shell Location Road, Mgbuoba',
      addressLine2: 'Port Harcourt, Rivers State, Nigeria',
      scripture: '"Jesus Christ no dey change yesterday, today, and forever."',
      rightsReserved: 'All rights reserved.',
      subscribeErrorMissing: 'Abeg put your name and either WhatsApp number or email address.',
      subscribeErrorInvalidEmail: 'Abeg put correct email address.',
      subscribeErrorInvalidPhone: 'Abeg put correct WhatsApp number.',
      subscribeSuccessFallback: 'You don subscribe for updates.',
      subscribeErrorFallback: 'We no fit subscribe now. Abeg try again shortly.'
    },
    home: {
      heroWelcome: 'Welcome to',
      heroTagline: 'We dey raise kingdom youths!',
      joinUs: 'Join Us',
      aboutUs: 'About Us',
      heroLiveCta: 'Watch Live',
      scroll: 'Scroll',
      newsletterTitle: 'No Miss Any Event',
      newsletterIntro:
        "Get personal WhatsApp message about coming events and weekly service. No miss wetin dey happen for Upper Room!",
      newsletterSuccessTitle: 'You Don Enter!',
      newsletterNamePlaceholder: 'Your Full Name',
      newsletterPhonePlaceholder: 'WhatsApp Number (e.g., +234 8123456789)',
      newsletterEmailPlaceholder: 'Your Email Address',
      newsletterSubmit: 'Subscribe & Get Updates',
      newsletterSubmitting: 'Subscribing...',
      closeNewsletterModal: 'Close newsletter sign-up modal',
      liveModalTitle: 'Live Service Stream',
      liveModalSubtitle: 'Join the broadcast for here without comot this page.',
      liveModalLoading: 'Dey connect to live stream...',
      liveModalError: 'We no fit load live stream now now.',
      liveModalOffline: 'We never dey live right now.',
      liveModalFallback: 'Join direct for YouTube while we dey prepare in-page stream.',
      liveModalOpenYoutube: 'Open for YouTube',
      closeLiveModal: 'Close live stream modal'
    },
    about: {
      bannerTitle: 'About Us',
      bannerSubtitle: 'Know who we be and wetin we believe'
    },
    live: {
      errorFallback: 'We no fit load live stream details now now.',
      heroEyebrow: 'Live + On Demand',
      heroTitle: 'Worship Live. Watch Anytime.',
      heroSubtitle:
        'Join Sunday service live when broadcast dey active. If we offline, catch up with latest message and recent sermons anytime.',
      loading: 'Dey load live stream status...',
      setupRequired: 'YouTube integration need setup for environment variables.',
      iframeTitleFallback: 'Live stream',
      liveNow: 'Live Now',
      offlineLabel: 'We offline right now',
      nextService: 'Next Service: Sunday, 8:00 AM (WAT)',
      offlineHint: 'Come back when service start, or watch latest sermon as you dey wait.',
      watchLatestSermon: 'Watch Latest Sermon',
      openMediaArchive: 'Open Media Archive',
      latestVideo: 'Latest Video',
      noVideo: 'No video available yet.',
      latestSermonAlt: 'Latest sermon',
      watchNow: 'Watch Now',
      browseArchive: 'Browse full media archive',
      recentSermons: 'Recent On-Demand Sermons',
      viewAll: 'View all',
      sermonCover: 'Sermon cover',
      watchOnYoutube: 'Watch on YouTube'
    }
  }
}
