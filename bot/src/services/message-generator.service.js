import { env } from '../config/env.js'
import { logger } from '../lib/logger.js'
import { GoogleAuth } from 'google-auth-library'

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

const buildServiceReminderPrompt = (name, serviceTime, isFirstSunday) => {
  const specialLine = isFirstSunday ? 'We have a special first-Sunday blessing prepared for you.' : ''
  return `You are a warm, polite pastor at FGC Mgbuoba writing a WhatsApp reminder to a church member.
Recipient: ${name}
Context: Sunday service is tomorrow at ${serviceTime} WAT. ${specialLine}

Write a warm, polite message following this style:
- Start with warm greeting and their name
- Ask how their week was and acknowledge God's faithfulness
- Politely encourage them to worship with us tomorrow
- Mention the service time
- Express hope to see them
- End with "God bless you!"
- Include at the end: "Reply STOP to opt out."

Do NOT include any placeholder text like [Name] or [Church Name]. Sign off as: Notifications @ The Upperroom
Use respectful, reverent Nigerian church English. Be warm but professional.
Max 100 words.`
}

const buildEventReminderPrompt = (name, eventTitle, eventDate) => {
  return `You are a warm, polite pastor at FGC Mgbuoba writing a WhatsApp event reminder to a church member.
Recipient: ${name}
Context: ${eventTitle} is scheduled for ${eventDate}.

Write a warm, polite message following this style:
- Greet them warmly by name
- Remind them about the event with details
- Express how much their presence would mean
- End with a blessing
- Include at the end: "Reply STOP to opt out."

Do NOT include any placeholder text like [Name] or [Church Name]. Sign off as: Notifications @ The Upperroom
Use respectful, reverent Nigerian church English. Be warm but professional.
Max 100 words.`
}

const callOpenAI = async (prompt) => {
  if (!env.OPENAI_API_KEY) {
    return null
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
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

  // Polite, reverent fallback templates
  const { firstName, gender } = analyzeVisitorName(name)
  
  const greetings = [
    `Hi ${firstName}, how was your week? I am sure God saw you through.`,
    `Hi ${firstName}, I trust God has been faithful to you this week.`,
    `Hello ${firstName}, I hope you had a blessed week.`,
    `Dear ${firstName}, I pray your week has been filled with God's grace.`
  ]

  const invitations = isFirstSunday ? [
    `I send this message to encourage you to worship with us tomorrow for our First Sunday service. Service will begin at ${serviceTime}, and we have something special prepared.`,
    `I would like to invite you to join us tomorrow for our First Sunday celebration. Service begins at ${serviceTime}, and your presence would be a blessing.`,
    `I encourage you to worship with us tomorrow as we celebrate First Sunday together. Service starts at ${serviceTime}.`
  ] : [
    `I send this message to you to encourage you to worship with us again tomorrow. Service will begin at ${serviceTime}, hoping to meet you there.`,
    `I would like to invite you to join us for service tomorrow at ${serviceTime}. Your presence would be a blessing to us.`,
    `I encourage you to worship with us tomorrow. Service starts at ${serviceTime}, and we would be delighted to have you.`
  ]

  const closings = [
    `God bless you!`,
    `May God's grace be with you!`,
    `The Lord bless and keep you!`
  ]

  const greeting = greetings[Math.floor(Math.random() * greetings.length)]
  const invitation = invitations[Math.floor(Math.random() * invitations.length)]
  const closing = closings[Math.floor(Math.random() * closings.length)]
  
  return `${greeting} ${invitation} ${closing} Reply STOP to opt out.`
}

export const generateEventReminderMessage = async ({ name, eventTitle, eventDate }) => {
  const prompt = buildEventReminderPrompt(name || 'there', eventTitle, eventDate)
  const llmMessage = await generateWithLlmProviders(prompt)

  if (llmMessage) return llmMessage

  // Polite event reminder templates
  const { firstName } = analyzeVisitorName(name)
  
  const eventGreetings = [
    `Dear ${firstName}, I hope this message finds you well.`,
    `Hi ${firstName}, I trust you are doing great.`,
    `Hello ${firstName}, I pray you are well.`
  ]

  const eventInvitations = [
    `I want to remind you about ${eventTitle} happening on ${eventDate}. Your presence would mean a lot to us, and we would be blessed to have you.`,
    `This is a reminder that ${eventTitle} is scheduled for ${eventDate}. We would be delighted if you could join us.`,
    `I wanted to let you know that ${eventTitle} will take place on ${eventDate}. We really hope to see you there.`
  ]

  const eventClosings = [
    `God bless you!`,
    `May the Lord bless you richly!`,
    `Grace and peace!`
  ]

  const greeting = eventGreetings[Math.floor(Math.random() * eventGreetings.length)]
  const invitation = eventInvitations[Math.floor(Math.random() * eventInvitations.length)]
  const closing = eventClosings[Math.floor(Math.random() * eventClosings.length)]
  
  return `${greeting} ${invitation} ${closing} Reply STOP to opt out.`
}
