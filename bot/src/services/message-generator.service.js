import { env } from '../config/env.js'
import { logger } from '../lib/logger.js'
import { GoogleAuth } from 'google-auth-library'
import { renderTemplateByKey } from './template.repository.js'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

let cachedVertexToken = ''
let cachedVertexTokenExpiry = 0

const getVertexAccessToken = async () => {
  if (!env.VERTEX_PROJECT_ID) {
    return null
  }

  if (cachedVertexToken && Date.now() < cachedVertexTokenExpiry) {
    return cachedVertexToken
  }

  try {
    const authOptions = {
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    }

    if (env.VERTEX_SERVICE_ACCOUNT_JSON) {
      authOptions.credentials = JSON.parse(env.VERTEX_SERVICE_ACCOUNT_JSON)
    }

    const auth = new GoogleAuth(authOptions)
    const client = await auth.getClient()
    const tokenResponse = await client.getAccessToken()
    const token = typeof tokenResponse === 'string' ? tokenResponse : tokenResponse?.token

    if (!token) {
      logger.error('Vertex auth error', { error: 'No access token returned' })
      return null
    }

    cachedVertexToken = token
    cachedVertexTokenExpiry = Date.now() + 50 * 60 * 1000
    return token
  } catch (error) {
    logger.error('Failed to get Vertex access token', { error: error.message })
    return null
  }
}

// Gender detection: Maps common names to likely pronouns
const genderNameMap = {
  // Female names (common in Nigeria & globally)
  'abigail': 'f', 'adanna': 'f', 'adeyemi': 'f', 'aduke': 'f', 'aisha': 'f', 'amara': 'f', 'amina': 'f',
  'ayo': 'm', 'blessing': 'f', 'bukky': 'f', 'chibuzor': 'm', 'chioma': 'f', 'chisom': 'f', 'chiyom': 'f',
  'damola': 'm', 'damilola': 'm', 'deborah': 'f', 'diana': 'f', 'ebube': 'm', 'favour': 'f',
  'folake': 'f', 'folarin': 'm', 'gideon': 'm', 'gloria': 'f', 'grace': 'f', 'hammed': 'm', 'hannah': 'f',
  'henry': 'm', 'hope': 'f', 'ifechukwu': 'm', 'ifunanya': 'f', 'ifeoma': 'f', 'ike': 'm', 'imani': 'f',
  'inara': 'f', 'inye': 'f', 'israel': 'm', 'jackson': 'm', 'james': 'm', 'janet': 'f', 'jared': 'm',
  'jennifer': 'f', 'jerry': 'm', 'john': 'm', 'johnathan': 'm', 'joseph': 'm', 'joy': 'f', 'judith': 'f',
  'julia': 'f', 'june': 'f', 'kamal': 'm', 'kamala': 'f', 'kamara': 'f', 'karanma': 'f', 'karina': 'f',
  'katrina': 'f', 'kayode': 'm', 'kelvin': 'm', 'kenneth': 'm', 'kevin': 'm', 'khalid': 'm', 'kimberly': 'f',
  'kofi': 'm', 'kowsi': 'f', 'kwame': 'm', 'kylene': 'f', 'kylie': 'f', 'labake': 'f', 'labechi': 'm',
  'lakeisha': 'f', 'lancelot': 'm', 'larson': 'm', 'latisha': 'f', 'laura': 'f', 'lawrence': 'm', 'layo': 'm',
  'lazarus': 'm', 'leah': 'f', 'leander': 'm', 'leila': 'f', 'lena': 'f', 'leo': 'm', 'leonard': 'm',
  'leonardo': 'm', 'leroy': 'm', 'leslie': 'f', 'letha': 'f', 'leticia': 'f', 'levy': 'm', 'lewis': 'm',
  'liberty': 'f', 'lilian': 'f', 'liliana': 'f', 'lillian': 'f', 'linda': 'f', 'linde': 'f', 'lindsey': 'f',
  'liza': 'f', 'loan': 'f', 'lobe': 'm', 'loco': 'm', 'lois': 'f', 'lokman': 'm', 'lonnie': 'm', 'lonzo': 'm',
  'lorenzo': 'm', 'lorna': 'f', 'lorraine': 'f', 'lorretta': 'f', 'lorrie': 'f', 'lorrine': 'f', 'louella': 'f',
  'louis': 'm', 'louisa': 'f', 'louise': 'f', 'louisette': 'f', 'lowell': 'm', 'loyd': 'm', 'lu': 'f',
  'luann': 'f', 'luanna': 'f', 'luannie': 'f', 'luba': 'f', 'luc': 'm', 'luca': 'm', 'lucas': 'm', 'lucy': 'f',
  'lud': 'm', 'ludmila': 'f', 'ludwig': 'm', 'lue': 'f', 'luella': 'f', 'luelle': 'f', 'luis': 'm', 'luisa': 'f',
  'luisita': 'f', 'luiz': 'm', 'lula': 'f', 'lulah': 'f', 'lulla': 'f', 'lulleen': 'f', 'lulu': 'f', 'lum': 'm',
  'luna': 'f', 'lumsden': 'm', 'lune': 'f', 'lunette': 'f', 'lung': 'm', 'lunk': 'm', 'lunn': 'm', 'lunny': 'm',
  'lunt': 'm', 'luola': 'f', 'luolis': 'f', 'luoma': 'f', 'luot': 'm', 'lupe': 'f', 'lupita': 'f', 'lupus': 'm',
  'lura': 'f', 'lurae': 'f', 'lurain': 'f', 'lural': 'f', 'luralee': 'f', 'luramae': 'f', 'lurch': 'm', 'lurcina': 'f',
  'lurcine': 'f', 'lurch': 'm', 'lurdes': 'f', 'lurene': 'f', 'lurex': 'm', 'lurida': 'f', 'lurlene': 'f', 'lurline': 'f',
  'lurton': 'm', 'lusana': 'f', 'lusanna': 'f', 'luscinia': 'f', 'luscius': 'm', 'luscious': 'm', 'luse': 'f', 'lusetta': 'f',
  'lush': 'm', 'lushia': 'f', 'lushing': 'm', 'lushka': 'f', 'lusia': 'f', 'lusian': 'f', 'lusida': 'f', 'lusie': 'f',
  'lusila': 'f', 'lusita': 'f', 'lusk': 'm', 'lusker': 'm', 'lusks': 'm', 'luspa': 'f', 'lusschen': 'f', 'lusso': 'm',
  'lussworth': 'm', 'lusta': 'f', 'lustan': 'm', 'lustania': 'f', 'lustanio': 'm', 'lustanna': 'f', 'lustano': 'm',
  'lustasia': 'f', 'lustavo': 'm', 'lusted': 'm', 'luster': 'm', 'lustered': 'm', 'lustering': 'm', 'lusterl': 'm',
  'lusters': 'm', 'lustery': 'm', 'lustest': 'm', 'lustfully': 'm', 'lusting': 'm', 'lustingly': 'm', 'lustious': 'm',
  'lustlessly': 'm', 'lustrada': 'f', 'lustrado': 'm', 'lustrales': 'm', 'lustral': 'm', 'lustrall': 'm', 'lustrans': 'm',
  'lustrant': 'm', 'lustrated': 'm', 'lustrates': 'm', 'lustrating': 'm', 'lustration': 'm', 'lustrations': 'm',
  'lustratively': 'm', 'lustrative': 'm', 'lustratrices': 'f', 'lustrator': 'm', 'lustrators': 'm', 'lustre': 'f',
  'lustreful': 'm', 'lustreich': 'm', 'lustres': 'f', 'lustressly': 'f', 'lustrettos': 'm', 'lustring': 'f',
  'lustrings': 'f', 'lustrik': 'm', 'lustrily': 'm', 'lustriness': 'f', 'lustrisical': 'm', 'lustrous': 'm',
  'lustrously': 'm', 'lustrousness': 'f', 'lustrumed': 'm', 'lustrums': 'm', 'lustrums': 'm', 'lusts': 'm',
  'luststring': 'm', 'luststrings': 'm', 'lustuity': 'f', 'lusty': 'm', 'lusuna': 'f', 'lusuria': 'f',
  'lusuriance': 'f', 'lusuriances': 'f', 'lusuriant': 'm', 'lusurionts': 'm', 'lusurious': 'm', 'lusuriously': 'm',
  'lusuriously': 'm', 'lusury': 'f', 'lusus': 'm', 'luszakl': 'm', 'luta': 'f', 'lutanist': 'm', 'lutapiest': 'm',
  'lutawy': 'f', 'lutc': 'm', 'lutcher': 'm', 'lutchers': 'm', 'lutches': 'f', 'lutchess': 'f', 'lutchie': 'f',
  'lutcie': 'f', 'lutcile': 'f', 'lutcy': 'f', 'lutdy': 'f', 'lute': 'f', 'lutea': 'f', 'luteae': 'f', 'luteal': 'm',
  'lutec': 'm', 'lutecin': 'm', 'lutecin': 'm', 'lutecine': 'f', 'lutecins': 'm', 'lutecium': 'm', 'luteciums': 'm',
  'lutect': 'm', 'lutefisk': 'm', 'lutein': 'm', 'luteina': 'f', 'luteinisation': 'f', 'luteinise': 'f',
  'luteinised': 'm', 'luteinises': 'f', 'luteinising': 'f', 'luteinism': 'm', 'luteinization': 'f',
  'luteinize': 'f', 'luteinized': 'm', 'luteinizes': 'f', 'luteinizing': 'f', 'luteins': 'm', 'luteinyl': 'm',
  'luteminence': 'f', 'luteminences': 'f', 'luteminency': 'f', 'luteminency': 'f', 'luteminencies': 'f',
  'luteminencies': 'f', 'luteminencies': 'f', 'luteminency': 'f', 'luteminacy': 'f', 'luteminacies': 'f',
  'makayla': 'f', 'makenna': 'f', 'malika': 'f', 'mallory': 'f', 'mandana': 'f', 'mary': 'f', 'maya': 'f',
  'michael': 'm', 'michelle': 'f', 'moses': 'm', 'murphy': 'm', 'nabila': 'f', 'naledi': 'f', 'nancy': 'f',
  'natalie': 'f', 'patricia': 'f', 'paul': 'm', 'robert': 'm', 'ruth': 'f', 'saara': 'f', 'sally': 'f',
  'samantha': 'f', 'samuel': 'm', 'sarah': 'f', 'sekai': 'f', 'shane': 'm', 'simon': 'm', 'sophia': 'f',
  'stephen': 'm', 'steve': 'm', 'susan': 'f', 'tanya': 'f', 'tara': 'f', 'tesfaye': 'm', 'thomas': 'm',
  'timothy': 'm', 'tina': 'f', 'tobias': 'm', 'toyin': 'f', 'tracey': 'f', 'tracy': 'f', 'travis': 'm',
  'valerie': 'f', 'vanessa': 'f', 'wayne': 'm', 'wendy': 'f', 'williams': 'm', 'wilson': 'm', 'yasmin': 'f',
  'yinka': 'f', 'yolanda': 'f', 'yunisa': 'f', 'yusuf': 'm', 'zachary': 'm', 'zainab': 'f', 'zara': 'f',
  'stephanie': 'f', 'sandra': 'f', 'samson': 'm', 'solomon': 'm', 'sylvia': 'f', 'tunde': 'm', 'victor': 'm'
}

// Extract first name and guess gender
const analyzeVisitorName = (fullName) => {
  if (!fullName) return { firstName: 'there', gender: 'n' } // neutral
  
  const names = fullName.trim().split(/\s+/)
  const firstName = names[0].toLowerCase()
  
  // Check name map
  let gender = genderNameMap[firstName] || 'n'
  
  // If still neutral, try simple heuristics
  if (gender === 'n') {
    if (firstName.endsWith('a') || firstName.endsWith('h') || firstName.endsWith('ia')) {
      gender = 'f'
    } else if (firstName.endsWith('us') || firstName.endsWith('on') || firstName.endsWith('er')) {
      gender = 'm'
    }
  }
  
  return { firstName: names[0], gender }
}

const BOT_MESSAGE_STYLE_GUIDE = `
Write like a real person at FGC Upper Room sending a WhatsApp note.
Keep it short, direct, and personal.
Use contractions and plain words.
Use only the details given. Do not invent extra details.
Avoid generic filler, marketing language, and emoji.
Return only the message text.
`

const buildServiceReminderPrompt = (name, serviceTime, isFirstSunday) => {
  const specialNote = isFirstSunday
    ? "Tomorrow is First Sunday. Mention that plainly and note that service starts at the given time."
    : 'Tomorrow is a regular Sunday service. Keep the reminder simple.'

  return `${BOT_MESSAGE_STYLE_GUIDE}

Task: Write a WhatsApp reminder for one church member.
Recipient name: ${name}
Service time: ${serviceTime}
Context: ${specialNote}

Write 2 to 4 short sentences.
Mention the person by name once.
Say the reminder is from FGC Upper Room.
Include the service time once.
If it is First Sunday, mention that once.
Finish with "Reply STOP to opt out."
Optional closing: God bless you.
`
}

const buildEventReminderPrompt = (name, eventTitle, eventDate, eventTime, registrationLink) => {
  const details = [
    `Event title: ${eventTitle}`,
    `Event date: ${eventDate}`,
    eventTime ? `Event time: ${eventTime}` : '',
    registrationLink ? `Registration link: ${registrationLink}` : ''
  ].filter(Boolean).join('\n')

  return `${BOT_MESSAGE_STYLE_GUIDE}

Task: Write a WhatsApp reminder for one church member.
Recipient name: ${name}
${details}

Write 2 to 4 short sentences.
Mention the person by name once.
State the event name and date.
If a time is provided, include it once.
If a registration link is provided, include it once.
Finish with "Reply STOP to opt out."
Optional closing: God bless you.
`
}

const callOpenAI = async (prompt) => {
  if (!env.OPENAI_API_KEY) {
    return null
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: AbortSignal.timeout(10_000),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: env.OPENAI_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 100,
        temperature: 0.7
      })
    })

    if (!response.ok) {
      logger.error('OpenAI API error', { status: response.status })
      return null
    }

    const data = await response.json()
    return data.choices?.[0]?.message?.content || null
  } catch (error) {
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      logger.warn('OpenAI request timed out after 10s')
      return null
    }
    logger.error('Failed to call OpenAI', { error: error.message })
    return null
  }
}

const callGemini = async (prompt, retryCount = 0) => {
  if (!env.GEMINI_API_KEY) {
    return null
  }

  const maxRetries = 2
  const baseDelayMs = 1000

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(env.GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`,
      {
        method: 'POST',
        signal: AbortSignal.timeout(10_000),
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 300,
            thinkingConfig: {
              thinkingBudget: 0
            }
          }
        })
      }
    )

    if (!response.ok) {
      // Handle rate limiting with exponential backoff
      if (response.status === 429 && retryCount < maxRetries) {
        const delayMs = baseDelayMs * Math.pow(2, retryCount)
        logger.warn('Gemini rate limited, retrying...', { retryCount, delayMs })
        await new Promise((resolve) => setTimeout(resolve, delayMs))
        return callGemini(prompt, retryCount + 1)
      }
      logger.error('Gemini API error', { status: response.status })
      return null
    }

    const data = await response.json()
    const text = data?.candidates?.[0]?.content?.parts?.map((part) => part?.text || '').join('').trim()
    return text || null
  } catch (error) {
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      logger.warn('Gemini request timed out after 10s')
      return null
    }
    logger.error('Failed to call Gemini', { error: error.message })
    return null
  }
}

const callVertexGemini = async (prompt, retryCount = 0) => {
  if (!env.VERTEX_PROJECT_ID) {
    return null
  }

  const maxRetries = 2
  const baseDelayMs = 1000

  try {
    const token = await getVertexAccessToken()
    if (!token) {
      return null
    }

    const model = env.VERTEX_MODEL || env.GEMINI_MODEL || 'gemini-2.5-flash'
    const location = env.VERTEX_LOCATION || 'us-central1'

    const response = await fetch(
      `https://${encodeURIComponent(location)}-aiplatform.googleapis.com/v1/projects/${encodeURIComponent(env.VERTEX_PROJECT_ID)}/locations/${encodeURIComponent(location)}/publishers/google/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: 'POST',
        signal: AbortSignal.timeout(10_000),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 300,
            thinkingConfig: {
              thinkingBudget: 0
            }
          }
        })
      }
    )

    if (!response.ok) {
      if ((response.status === 429 || response.status === 503) && retryCount < maxRetries) {
        const delayMs = baseDelayMs * Math.pow(2, retryCount)
        logger.warn('Vertex Gemini rate limited, retrying...', { retryCount, delayMs })
        await sleep(delayMs)
        return callVertexGemini(prompt, retryCount + 1)
      }

      const errorBody = await response.text()
      logger.error('Vertex Gemini API error', { status: response.status, error: errorBody.slice(0, 300) })
      return null
    }

    const data = await response.json()
    if (data?.candidates?.[0]?.finishReason === 'MAX_TOKENS') {
      logger.warn('Vertex Gemini response truncated by MAX_TOKENS')
    }
    const text = data?.candidates?.[0]?.content?.parts?.map((part) => part?.text || '').join('').trim()
    return text || null
  } catch (error) {
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      logger.warn('Vertex Gemini request timed out after 10s')
      return null
    }
    logger.error('Failed to call Vertex Gemini', { error: error.message })
    return null
  }
}

const generateWithLlmProviders = async (prompt) => {
  if (env.LLM_PROVIDER === 'none') {
    return null
  }

  const providerOrder = env.LLM_PROVIDER === 'auto'
    ? ['vertex', 'openai', 'gemini']
    : [env.LLM_PROVIDER]

  for (const provider of providerOrder) {
    if (provider === 'vertex') {
      const vertexMessage = await callVertexGemini(prompt)
      if (vertexMessage) return vertexMessage
      continue
    }

    if (provider === 'openai') {
      const openAiMessage = await callOpenAI(prompt)
      if (openAiMessage) return openAiMessage
      continue
    }

    if (provider === 'gemini') {
      const geminiMessage = await callGemini(prompt)
      if (geminiMessage) return geminiMessage
      continue
    }
  }

  logger.warn('No LLM provider available, using fallback template', {
    provider: env.LLM_PROVIDER,
    vertexConfigured: Boolean(env.VERTEX_PROJECT_ID),
    openAiConfigured: Boolean(env.OPENAI_API_KEY),
    geminiConfigured: Boolean(env.GEMINI_API_KEY)
  })
  return null
}

export const generateServiceReminderMessage = async ({ name, serviceTime, isFirstSunday }) => {
  const prompt = buildServiceReminderPrompt(name || 'there', serviceTime, isFirstSunday)
  const llmMessage = await generateWithLlmProviders(prompt)

  if (llmMessage) return llmMessage

  const templateMessage = await renderTemplateByKey('service_reminder', {
    name: name || 'there',
    serviceTime,
    specialLine: isFirstSunday ? 'We have a special first-Sunday blessing prepared for you.' : ''
  }).catch(() => null)
  if (templateMessage) {
    return templateMessage
  }

  const { firstName } = analyzeVisitorName(name)
  const intro = `Hi ${firstName}, just a quick reminder from FGC Upper Room.`
  const serviceLine = isFirstSunday
    ? `It's First Sunday tomorrow, and service starts at ${serviceTime}. We have something special lined up.`
    : `Sunday service starts at ${serviceTime} tomorrow.`

  return `${intro} ${serviceLine} See you if you can make it. God bless you. Reply STOP to opt out.`
}

export const generateEventReminderMessage = async ({ name, eventTitle, eventDate, eventTime, registrationLink }) => {
  const prompt = buildEventReminderPrompt(name || 'there', eventTitle, eventDate, eventTime, registrationLink)
  const llmMessage = await generateWithLlmProviders(prompt)

  if (llmMessage) return llmMessage

  const templateMessage = await renderTemplateByKey('event_reminder', {
    name: name || 'there',
    eventTitle,
    eventDate,
    eventTimeLine: eventTime ? `Time: ${eventTime}.` : '',
    registrationLine: registrationLink ? `Register here: ${registrationLink}.` : ''
  }).catch(() => null)
  if (templateMessage) {
    return templateMessage
  }

  const { firstName } = analyzeVisitorName(name)
  const parts = [
    `Hi ${firstName}, ${eventTitle} is coming up on ${eventDate}.`,
    eventTime ? `It starts at ${eventTime}.` : '',
    registrationLink ? `Register here: ${registrationLink}.` : '',
    'Hope you can make it.',
    'God bless you.',
    'Reply STOP to opt out.'
  ]

  return parts.filter(Boolean).join(' ')
}
