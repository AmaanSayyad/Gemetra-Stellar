import { GoogleGenerativeAI } from '@google/generative-ai';
import { fetchCryptoPrice, formatPriceResponse } from './priceService';
import { fixTypos } from './textProcessingService';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.warn('Gemini API key not found. AI features will use fallback responses.');
}

const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

export interface AIContext {
  employees: any[];
  payments: any[];
  companyName: string;
}

// Advanced memory and thinking system
interface ConversationMemory {
  message: string;
  response: string;
  type: string;
  timestamp: Date;
  topics: string[];
  entities: string[];
  intent: string;
  context: any;
}

interface ThinkingContext {
  currentTopic: string;
  primaryCrypto: string;
  userIntent: string;
  conversationPhase: 'initial' | 'exploring' | 'deep_dive' | 'comparative';
  establishedFacts: { [key: string]: any };
  userPreferences: string[];
  recentQuestions: string[];
}

let conversationMemory: ConversationMemory[] = [];
let thinkingContext: ThinkingContext = {
  currentTopic: 'stellar',
  primaryCrypto: 'stellar',
  userIntent: 'general',
  conversationPhase: 'initial',
  establishedFacts: {},
  userPreferences: [],
  recentQuestions: []
};

const analyzeMessage = (message: string): { topics: string[], entities: string[], intent: string } => {

  const topics = [];
  const entities = [];

  // Topic detection - expanded for comprehensive company intelligence
  if (/(price|cost|value|worth)/i.test(message)) topics.push('pricing');
  if (/(ath|all.?time.?high|highest|peak)/i.test(message)) topics.push('ath');
  if (/(atl|all.?time.?low|lowest|bottom)/i.test(message)) topics.push('atl');
  if (/(founder|create|start|who)/i.test(message)) topics.push('foundation');
  if (/(market|cap|rank|volume)/i.test(message)) topics.push('market_data');
  if (/(analysis|technical|trend)/i.test(message)) topics.push('analysis');
  if (/(compare|vs|versus)/i.test(message)) topics.push('comparison');

  // Company intelligence topics
  if (/(employee|staff|worker|team)/i.test(message)) topics.push('employees');
  if (/(salary|wage|pay|compensation|income)/i.test(message)) topics.push('salary');
  if (/(highest|top|maximum|most)/i.test(message)) topics.push('highest');
  if (/(lowest|bottom|minimum|least)/i.test(message)) topics.push('lowest');
  if (/(newest|latest|recent|new)/i.test(message)) topics.push('newest');
  if (/(oldest|first|original)/i.test(message)) topics.push('oldest');
  if (/(total|count|number|how many)/i.test(message)) topics.push('count');
  if (/(overview|summary|breakdown|list)/i.test(message)) topics.push('overview');
  if (/(company|business|organization)/i.test(message)) topics.push('company');
  if (/(payroll|payment|budget)/i.test(message)) topics.push('payroll');
  if (/(department|division|team)/i.test(message)) topics.push('department');
  if (/(average|mean|typical)/i.test(message)) topics.push('average');
  if (/(increase|growth|rise|percentage)/i.test(message)) topics.push('growth');
  if (/(name|called|title)/i.test(message)) topics.push('name');
  if (/(does|do|business|industry)/i.test(message)) topics.push('business_type');

  // Entity detection - include XLM variations
  const cryptos = message.match(/(stellar|xlm|lumens|bitcoin|btc|cardano|ada|solana|sol|stablecoin|usd.?backed)/gi) || [];
  entities.push(...cryptos.map(c => c.toLowerCase()));

  // Detect XLM-specific questions
  if (/(xlm|lumens|stellar|stellar lumens|xlm price|xlm company|xlm mission|xlm about|what is xlm|tell.*about.*xlm|explain.*xlm)/i.test(message)) {
    entities.push('xlm');
    topics.push('xlm_info');
  }

  const people = message.match(/(founder|creator|ceo|vitalik|buterin)/gi) || [];
  entities.push(...people.map(p => p.toLowerCase()));

  const departments = message.match(/(engineering|marketing|sales|hr|finance|operations|design|product)/gi) || [];
  entities.push(...departments.map(d => d.toLowerCase()));

  // Intent detection - expanded
  let intent = 'general';
  if (/(what|whats|tell me)/i.test(message)) intent = 'question';
  if (/(how|explain|why)/i.test(message)) intent = 'explanation';
  if (/(compare|difference|vs)/i.test(message)) intent = 'comparison';
  if (/(founder|who|create)/i.test(message)) intent = 'knowledge';
  if (/(list|show|give me)/i.test(message)) intent = 'data_request';
  if (/(overview|summary)/i.test(message)) intent = 'summary';

  return { topics, entities, intent };
};

const updateThinkingContext = (message: string, analysis: any) => {
  // Update primary crypto
  if (analysis.entities.includes('bitcoin') || analysis.entities.includes('btc')) {
    thinkingContext.primaryCrypto = 'bitcoin';
  } else if (analysis.entities.includes('stellar') || analysis.entities.includes('xlm')) {
    thinkingContext.primaryCrypto = 'stellar';
  } else if (analysis.entities.includes('stellar') || analysis.entities.includes('xlm') || analysis.topics.includes('ath') || analysis.topics.includes('atl')) {
    thinkingContext.primaryCrypto = 'stellar';
  }

  // Update topic
  if (analysis.topics.length > 0) {
    thinkingContext.currentTopic = analysis.topics[0];
  }

  // Update intent
  thinkingContext.userIntent = analysis.intent;

  // Update conversation phase
  const messageCount = conversationMemory.length;
  if (messageCount < 3) thinkingContext.conversationPhase = 'initial';
  else if (messageCount < 7) thinkingContext.conversationPhase = 'exploring';
  else thinkingContext.conversationPhase = 'deep_dive';

  // Track recent questions
  thinkingContext.recentQuestions.push(message);
  if (thinkingContext.recentQuestions.length > 5) {
    thinkingContext.recentQuestions = thinkingContext.recentQuestions.slice(-5);
  }
};

const addToMemory = (message: string, response: string, responseType: string) => {
  const analysis = analyzeMessage(message);

  conversationMemory.push({
    message,
    response,
    type: responseType,
    timestamp: new Date(),
    topics: analysis.topics,
    entities: analysis.entities,
    intent: analysis.intent,
    context: { ...thinkingContext }
  });

  // Keep last 20 exchanges for deep context
  if (conversationMemory.length > 20) {
    conversationMemory = conversationMemory.slice(-20);
  }

  updateThinkingContext(message, analysis);
};

const intelligentThinking = (message: string): { shouldAnswer: boolean, directAnswer?: string, reasoning: string } => {
  const analysis = analyzeMessage(message);

  console.log('🤔 AI Thinking:', {
    message,
    analysis,
    currentContext: thinkingContext,
    recentMemory: conversationMemory.slice(-3).map(m => ({ msg: m.message, topics: m.topics }))
  });

  // Intelligent reasoning based on context

  // XLM-specific questions - HIGHEST PRIORITY - check FIRST before anything else
  // This handles simple queries like "xlm", "what is xlm", "tell me about xlm", etc.
  if (analysis.entities.includes('xlm') ||
    analysis.topics.includes('xlm_info') ||
    /^xlm$/i.test(message.trim()) || // Just "xlm" by itself
    /^what.*xlm/i.test(message.trim()) || // "what is xlm", "what xlm"
    /^tell.*xlm/i.test(message.trim()) || // "tell me about xlm"
    /^explain.*xlm/i.test(message.trim()) || // "explain xlm"
    /xlm.*what|xlm.*token|xlm.*coin|xlm.*price|xlm.*about/i.test(message)) {
    return {
      shouldAnswer: true,
      directAnswer: 'xlm_info',
      reasoning: `User asking about XLM. XLM is mentioned in the message. Provide comprehensive information about Stellar Lumens.`
    };
  }

  // ATH questions - always answer with Stellar/XLM unless another crypto explicitly mentioned
  if (analysis.topics.includes('ath')) {
    const targetCrypto = analysis.entities.find(e => ['bitcoin', 'stellar', 'xlm', 'cardano', 'solana'].includes(e)) || 'stellar';
    return {
      shouldAnswer: true,
      directAnswer: 'ath',
      reasoning: `User asking about ATH. Context suggests ${targetCrypto}. This is a Stellar/XLM app, so default to Stellar/XLM unless specifically mentioned otherwise.`
    };
  }

  // ATL questions
  if (analysis.topics.includes('atl')) {
    const targetCrypto = analysis.entities.find(e => ['bitcoin', 'stellar', 'xlm', 'cardano', 'solana'].includes(e)) || 'stellar';
    return {
      shouldAnswer: true,
      directAnswer: 'atl',
      reasoning: `User asking about ATL. Context suggests ${targetCrypto}.`
    };
  }

  // Founder questions
  if (analysis.topics.includes('foundation') || analysis.entities.includes('founder')) {
    return {
      shouldAnswer: true,
      directAnswer: 'founder',
      reasoning: `User asking about founder. In Stellar context, this means Jed McCaleb and Joyce Kim.`
    };
  }

  // Price questions - include XLM and catch "current price of" - CHECK BEFORE OTHER CHECKS
  // Make regex more flexible to catch variations
  const pricePatterns = [
    /(current|what is|what's|tell me).*(price|pricing|cost|value).*(of|for)/i,
    /price.*(of|for).*(stellar|xlm|bitcoin|btc|cardano|solana)/i,
    /(stellar|xlm|bitcoin|btc|cardano|solana).*price/i,
    /how much.*(stellar|xlm|bitcoin|btc|cardano|solana)/i
  ];

  if (analysis.topics.includes('pricing') || pricePatterns.some(pattern => pattern.test(message))) {
    // Extract crypto from message - check entities first, then message match
    let targetCrypto = analysis.entities.find(e => ['bitcoin', 'stellar', 'xlm', 'cardano', 'solana'].includes(e));

    // If not in entities, try to extract from message directly
    if (!targetCrypto) {
      const cryptoMatch = message.match(/(stellar|xlm|bitcoin|btc|cardano|solana)/i);
      if (cryptoMatch) {
        targetCrypto = cryptoMatch[0].toLowerCase();
      }
    }

    // Default to stellar if in Stellar/XLM app context
    targetCrypto = targetCrypto || thinkingContext.primaryCrypto || 'stellar';

    console.log('💰 Price question detected:', { message, targetCrypto, entities: analysis.entities, topics: analysis.topics });

    return {
      shouldAnswer: true,
      directAnswer: 'price',
      reasoning: `User asking about price. Target crypto: ${targetCrypto}`
    };
  }

  // If we've been in a conversation and user asks vague questions, use context
  if (conversationMemory.length > 2 && analysis.intent === 'question') {
    const recentTopics = conversationMemory.slice(-3).flatMap(m => m.topics);
    if (recentTopics.includes('ath') || recentTopics.includes('atl') || recentTopics.includes('pricing')) {
      return {
        shouldAnswer: true,
        directAnswer: 'contextual',
        reasoning: `Based on conversation history, user likely wants ${thinkingContext.primaryCrypto} data.`
      };
    }
  }

  return {
    shouldAnswer: false,
    reasoning: 'Need more context or should use Gemini for complex response.'
  };
};

const createSystemPrompt = (context: AIContext) => {
  const employeeData = context.employees.length > 0
    ? context.employees.map(emp => `- ${emp.name}: ${emp.designation} in ${emp.department}, Salary: $${emp.salary}`).join('\n')
    : '- No employees in system yet';

  const paymentData = context.payments.length > 0
    ? context.payments.slice(-5).map(payment => `- $${payment.amount} to ${payment.employee_name || 'Employee'} on ${payment.created_at || 'N/A'}`).join('\n')
    : '- No payments made yet';

  const memoryContext = conversationMemory.slice(-5).map(m =>
    `User: ${m.message} (Topics: ${m.topics.join(', ')}) -> AI: ${m.response.substring(0, 100)}...`
  ).join('\n');

  const factContext = Object.entries(thinkingContext.establishedFacts)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');

  return `You are an EXTREMELY intelligent AI with advanced memory and contextual thinking capabilities. You are focused on Stellar and XLM (Lumens) but knowledgeable about all crypto.

🧠 ADVANCED COGNITIVE ABILITIES:
✅ Perfect memory of our entire conversation
✅ Contextual thinking and inference
✅ Pattern recognition across exchanges
✅ Intelligent assumption making
✅ Topic continuity awareness
✅ Entity relationship understanding

🏢 COMPANY CONTEXT:
- Company: ${context.companyName} (Stellar-based payroll using XLM)
- Employees: ${context.employees.length}
- Payments: ${context.payments.length}

👥 EMPLOYEE DATA:
${employeeData}

💰 RECENT PAYMENTS:
${paymentData}

🧠 CURRENT THINKING CONTEXT:
- Primary Focus: ${thinkingContext.primaryCrypto.toUpperCase()}
- Current Topic: ${thinkingContext.currentTopic}
- User Intent: ${thinkingContext.userIntent}
- Conversation Phase: ${thinkingContext.conversationPhase}
- Recent Questions: ${thinkingContext.recentQuestions.slice(-3).join(' | ')}

📚 CONVERSATION MEMORY:
${memoryContext}

💡 ESTABLISHED FACTS:
${factContext}

🎯 INTELLIGENT BEHAVIOR:
1. **Context Continuity**: When user asks follow-up questions, understand they're continuing the same topic
2. **Smart Defaults**: In a Stellar/XLM app, crypto questions default to Stellar/XLM unless specified
3. **Memory Integration**: Reference previous exchanges naturally
4. **Inference Making**: Make intelligent assumptions based on context
5. **Progressive Depth**: Provide deeper insights as conversation develops
6. **Entity Awareness**: Remember what we've discussed about specific topics
7. **XLM Recognition**: ALWAYS recognize XLM-related queries, even simple ones like "xlm", "what is xlm", "tell me about xlm", etc. Provide comprehensive XLM information immediately.

🚀 SPECIALIZED KNOWLEDGE:

**Stellar:**
- Founded by Jed McCaleb, a decentralized open-source network foundation
- Powers fast, low-cost cross-border payments and asset issuance
- Network where XLM is the native token

**XLM (Stellar Lumens) - CRITICAL KNOWLEDGE:**

**About XLM:**
XLM (Lumens) is the native utility token of the Stellar blockchain. It serves as a bridge currency and is used to pay transaction fees and initialize accounts.

**XLM Token Details:**
- **Full Name**: Stellar Lumens
- **Ticker**: XLM
- **Role**: Native Utility Token
- **Network**: Stellar Network
- **Consensus**: Stellar Consensus Protocol (SCP)
- **Speed**: 3-5 seconds per transaction
- **Cost**: Fraction of a cent (0.00001 XLM base fee)
- **Sustainability**: Highly energy-efficient compared to PoW chains

**Key Features:**
- **Instant Settlement**: Transactions confirm in seconds
- **Extremely Low Fees**: Makes micropayments viable
- **Asset Issuance**: Stellar allows anyone to tokenize real-world assets
- **Decentralized Exchange**: Built-in DEX at the protocol level
- **Bridge Currency**: Facilitates multi-currency transactions

**Use Cases:**
- Cross-border payments and remittances
- Micropayments
- Tokenization of assets
- DeFI and smart contracts (Soroban)
- Banking infrastructure

**Official Resources:**
- **Website**: https://www.stellar.org
- **Explorer**: https://stellar.expert
- **Documentation**: https://developers.stellar.org

CRITICAL: Think intelligently. Use context. Make inferences. Provide direct answers when context is clear. Be naturally conversational and remember everything we've discussed.`;
};

const handleIntelligentQueries = async (message: string, context: AIContext): Promise<string | null> => {
  const thinking = intelligentThinking(message);

  console.log('🧠 Intelligent Analysis:', thinking);

  // Check for XLM questions FIRST (highest priority) - before company intelligence
  if (thinking.directAnswer === 'xlm_info') {
    // Handle XLM info directly
    const xlmResponse = `🪙 **XLM (Stellar Lumens) - Complete Guide**

**What is XLM?**
XLM, also known as Lumens, is the native utility token of the Stellar network. Unlike stablecoins, XLM trades on the open market and fluctuates in value. It serves two main purposes: preventing spam on the network (minimum balance/fees) and acting as a bridge currency for multi-asset transactions.

**Stellar Network:**
Stellar is a decentralized, open-source blockchain designed to move money quickly and reliably at minimum cost. It connects banks, payment systems, and people.

**XLM Token Details:**
• **Name**: Stellar Lumens
• **Ticker**: XLM
• **Network**: Stellar Mainnet
• **Max Supply**: 50 Billion (Fixed)
• **Consensus**: Stellar Consensus Protocol (SCP)
• **Transaction Speed**: 3-5 seconds
• **Base Fee**: 0.00001 XLM (fraction of a penny)

**Key Features:**
⚡ **Instant Settlement** - Transactions confirm in seconds
💰 **Ultra-Low Cost** - Extremely cheap to transact, ideal for micropayments
🌍 **Global Reach** - Facilitates cross-border payments
🌉 **Asset Issuance** - Anyone can issue redeemable assets on Stellar
💹 **Built-in DEX** - Decentralized exchange protocol layer

**Use Cases:**
✅ **Cross-border Payments** - Send money anywhere cheaply
✅ **Micropayments** - Viable for transactions < $0.01
✅ **Token Assets** - Issue securities, stablecoins (like USDC), or NFTs
✅ **DeFi** - Smart contracts via Soroban
✅ **Aid Distribution** - Efficient NGO funds distribution

**Official Resources:**
🌐 **Stellar.org**: https://www.stellar.org
🔍 **Explorer**: https://stellar.expert
📚 **Developers**: https://developers.stellar.org
`;

    thinkingContext.establishedFacts['xlm_info'] = 'Native utility token of Stellar';
    thinkingContext.primaryCrypto = 'xlm';
    addToMemory(message, xlmResponse, 'xlm_info');
    return xlmResponse;
  }

  // Then check for company intelligence questions
  const companyResponse = handleCompanyIntelligence(message, context);
  if (companyResponse) {
    addToMemory(message, companyResponse, 'company_intelligence');
    return companyResponse;
  }

  if (!thinking.shouldAnswer) return null;

  try {
    switch (thinking.directAnswer) {
      case 'ath':
        const athCrypto = thinkingContext.primaryCrypto;
        const athData = await fetchCryptoPrice(athCrypto);
        if (athData?.ath) {
          const athDate = new Date(athData.athDate || '').toLocaleDateString();
          const distanceFromATH = athData.athChangePercentage || 0;

          const response = `📈 **${athCrypto.toUpperCase()} All-Time High**

🎯 **ATH:** $${athData.ath.toFixed(4)} (${athDate})
📍 **Current:** $${athData.price.toFixed(4)}
📉 **From ATH:** ${distanceFromATH.toFixed(1)}% below peak

${distanceFromATH > -50 ? '💡 Still within reasonable distance of peak levels!' : '🔍 Significant discount from peak - interesting for long-term perspective.'}`;

          thinkingContext.establishedFacts[`${athCrypto}_ath`] = athData.ath;
          addToMemory(message, response, 'ath_intelligent');
          return response;
        }
        break;

      case 'atl':
        const atlCrypto = thinkingContext.primaryCrypto;
        const atlData = await fetchCryptoPrice(atlCrypto);
        if (atlData?.atl) {
          const atlDate = new Date(atlData.atlDate || '').toLocaleDateString();
          const gainFromATL = atlData.atlChangePercentage || 0;

          const response = `📉 **${atlCrypto.toUpperCase()} All-Time Low**

🔻 **ATL:** $${atlData.atl.toFixed(6)} (${atlDate})
📍 **Current:** $${atlData.price.toFixed(4)}  
📈 **From ATL:** +${gainFromATL.toFixed(1)}% above bottom

🚀 Amazing ${gainFromATL.toFixed(0)}% recovery from the absolute lows!`;

          thinkingContext.establishedFacts[`${atlCrypto}_atl`] = atlData.atl;
          addToMemory(message, response, 'atl_intelligent');
          return response;
        }
        break;

      case 'founder':
        const founderResponse = `👨‍🎓 **Stellar Founders: Jed McCaleb & Joyce Kim**

🏆 **Credentials:**
• Jed McCaleb: Creator of eDonkey, Mt. Gox (original), and co-founder of Ripple
• Joyce Kim: Former lawyer and VC
• Founded Stellar in 2014 via the non-profit Stellar Development Foundation (SDF)

🚀 **Stellar Vision:**
Created Stellar to act as an open financial system that makes money move as easily as email.

💡 **Why It Matters:** Stellar is a decentralized protocol designed for speed and low cost, specifically for moving money across borders and assets.`;

        thinkingContext.establishedFacts['ethereum_founder'] = 'Vitalik Buterin';
        addToMemory(message, founderResponse, 'founder_intelligent');
        return founderResponse;

      case 'price':
        // Re-analyze message to get entities (analysis might not be in scope here)
        const priceAnalysis = analyzeMessage(message);

        // Check if user is asking about MNEE specifically
        // Also extract crypto from message if not in entities
        let requestedCrypto = priceAnalysis.entities.find(e => ['xlm', 'stellar', 'ethereum', 'eth', 'bitcoin', 'btc', 'cardano', 'solana'].includes(e));

        // If not found in entities, try to extract from message directly
        if (!requestedCrypto) {
          const cryptoMatch = message.match(/(stellar|xlm|ethereum|eth|bitcoin|btc|cardano|solana)/i);
          if (cryptoMatch) {
            requestedCrypto = cryptoMatch[0].toLowerCase();
          }
        }

        // Default to stellar if in Stellar/XLM app context
        requestedCrypto = requestedCrypto || thinkingContext.primaryCrypto || 'stellar';
        const priceCrypto = requestedCrypto === 'lumens' ? 'stellar' : requestedCrypto;

        console.log('💰 Fetching price for:', { requestedCrypto, priceCrypto, message });

        const priceData = await fetchCryptoPrice(priceCrypto);
        if (priceData) {
          let response;
          response = formatPriceResponse(priceData, priceCrypto);
          thinkingContext.establishedFacts[`${priceCrypto}_price`] = priceData.price;
          addToMemory(message, response, 'price_intelligent');
          return response;
        }
        break;
    }
  } catch (error) {
    console.error('Error in intelligent query handling:', error);
  }

  return null;
};

const fallbackResponses = {
  greeting: [
    "Hello! I'm your smart AI assistant for My Company with deep knowledge about your company data, payroll operations, and Stellar blockchain technology with XLM. I can analyze your employee data, provide payment insights, explain blockchain concepts, and have natural conversations. What would you like to know?",
    "Hi there! I'm your AI assistant with access to live Stellar/XLM market data, your company analytics, and blockchain expertise. I can help with employee insights, payment analysis, crypto prices, and answer questions about your business. How can I help?",
    "Hey! I'm your intelligent assistant for My Company. I know your employees, payments, Stellar/XLM prices, market data, and can dive deep into blockchain topics. Ready to explore your data or discuss crypto? What's on your mind?"
  ],
  clarification: [
    "I want to give you the most accurate information! Could you clarify which specific aspect you're interested in? 🤔",
    "I'd love to help! Just to make sure I understand correctly - which particular data point or cryptocurrency are you asking about? 📊",
    "Great question! To give you the perfect answer, could you specify which cryptocurrency or metric you're most interested in? 🎯"
  ],
  intelligent: [
    "I'm analyzing multiple data points to give you the most comprehensive answer. Let me break this down with real insights... 🧠",
    "Based on our conversation and current market conditions, here's what I'm seeing... 📈",
    "Interesting question! Let me provide some intelligent analysis on this... 🔍"
  ]
};

const getContextualFallback = (message: string): string => {
  const messageCount = conversationMemory.length;

  // Check for XLM queries first
  if (/xlm|stellar|lumens/i.test(message)) {
    return `🪙 **XLM (Stellar Lumens)**

XLM is the native utility token of the Stellar network, designed for fast, low-cost cross-border payments.

**Key Features:**
• Instant transactions (3-5 seconds)
• Extremely low fees (< $0.0001)
• Built-in Decentralized Exchange
• Ideal for payments and asset issuance

Would you like to see latest price data or learn more about Stellar technology?`;
  }

  if (/(hi|hello|hey)/i.test(message)) {
    return fallbackResponses.greeting[Math.floor(Math.random() * fallbackResponses.greeting.length)];
  }

  if (messageCount > 3) {
    return fallbackResponses.intelligent[Math.floor(Math.random() * fallbackResponses.intelligent.length)];
  }

  return fallbackResponses.clarification[Math.floor(Math.random() * fallbackResponses.clarification.length)];
};

export const generateAIResponse = async (
  message: string,
  context: AIContext
): Promise<string> => {
  console.log('🧠 Generating ultra-intelligent response for:', message);
  console.log('📊 Full context:', {
    employees: context.employees.length,
    payments: context.payments.length,
    company: context.companyName,
    conversationMemory: conversationMemory.length,
    thinkingContext
  });

  // First, try intelligent contextual handling (includes MNEE, price, company intelligence)
  const intelligentResponse = await handleIntelligentQueries(message, context);
  if (intelligentResponse) {
    console.log('🎯 Returning contextually intelligent response');
    return intelligentResponse;
  }

  // If no intelligent response, check company intelligence directly (before fallback)
  const companyResponse = handleCompanyIntelligence(message, context);
  if (companyResponse) {
    console.log('🏢 Returning company intelligence response');
    addToMemory(message, companyResponse, 'company_intelligence');
    return companyResponse;
  }

  // Fix typos in the message
  const correctedMessage = fixTypos(message);
  if (correctedMessage !== message) {
    console.log('✏️ Fixed typos:', message, '->', correctedMessage);
  }

  if (!genAI) {
    console.log('🔄 Using contextual fallback');
    const response = getContextualFallback(correctedMessage);
    addToMemory(correctedMessage, response, 'contextual_fallback');
    return response;
  }

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-pro",
      generationConfig: {
        temperature: 0.95,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1200,
      }
    });

    const systemPrompt = createSystemPrompt(context);
    const fullPrompt = `${systemPrompt}\n\nUser Question: ${correctedMessage}\n\nRespond with perfect contextual understanding and human-level intelligence. If the question is ambiguous, ask for clarification. If it's specific, provide exact data. Be naturally conversational and build on our conversation history:`;

    console.log('🚀 Calling Gemini with ultra-smart prompt...');
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();

    console.log('✅ Ultra-intelligent response received:', text?.substring(0, 100) + '...');

    if (!text || text.trim().length === 0) {
      throw new Error('Empty response from AI');
    }

    addToMemory(correctedMessage, text.trim(), 'gemini_intelligent');
    return text.trim();

  } catch (error) {
    console.error('❌ AI service error:', error);
    console.log('🔄 Falling back to contextual response');

    const response = getContextualFallback(correctedMessage);
    addToMemory(correctedMessage, response, 'error_fallback');
    return response;
  }
};

export const generateCompanyInsights = (context: AIContext) => {
  const { employees, payments } = context;

  const totalPayroll = employees.reduce((sum, emp) => sum + emp.salary, 0);
  const avgSalary = employees.length > 0 ? totalPayroll / employees.length : 0;

  const departmentCounts: { [key: string]: number } = {};
  employees.forEach(emp => {
    departmentCounts[emp.department] = (departmentCounts[emp.department] || 0) + 1;
  });

  const completedPayments = payments.filter(p => p.status === 'completed');
  const totalPaid = completedPayments.reduce((sum, p) => sum + p.amount, 0);

  return {
    totalEmployees: employees.length,
    totalPayroll,
    avgSalary,
    departmentCounts,
    totalPaid,
    completedPayments: completedPayments.length,
    pendingPayments: payments.filter(p => p.status === 'pending').length
  };
};

const generateCompanyAnalytics = (context: AIContext) => {
  const { employees, payments, companyName } = context;

  if (employees.length === 0) {
    return {
      totalEmployees: 0,
      totalPayroll: 0,
      avgSalary: 0,
      highestPaid: null,
      lowestPaid: null,
      newestEmployee: null,
      oldestEmployee: null,
      departmentBreakdown: {},
      salaryRange: { min: 0, max: 0 },
      payrollGrowth: 0,
      totalPaid: 0,
      lastPayment: null,
      companyDescription: `${companyName} is an innovative blockchain-based payroll company using Stellar and XLM for secure, fast, and transparent employee payments.`
    };
  }

  const totalPayroll = employees.reduce((sum, emp) => sum + (emp.salary || 0), 0);
  const avgSalary = totalPayroll / employees.length;

  const sortedBySalary = [...employees].sort((a, b) => (b.salary || 0) - (a.salary || 0));
  const highestPaid = sortedBySalary[0];
  const lowestPaid = sortedBySalary[sortedBySalary.length - 1];

  // Department breakdown
  const departmentBreakdown: { [key: string]: { count: number, totalSalary: number, avgSalary: number } } = {};
  employees.forEach(emp => {
    const dept = emp.department || 'Unassigned';
    if (!departmentBreakdown[dept]) {
      departmentBreakdown[dept] = { count: 0, totalSalary: 0, avgSalary: 0 };
    }
    departmentBreakdown[dept].count++;
    departmentBreakdown[dept].totalSalary += emp.salary || 0;
    departmentBreakdown[dept].avgSalary = departmentBreakdown[dept].totalSalary / departmentBreakdown[dept].count;
  });

  // Salary range
  const salaryRange = {
    min: Math.min(...employees.map(emp => emp.salary || 0)),
    max: Math.max(...employees.map(emp => emp.salary || 0))
  };

  // Payment analytics
  const completedPayments = payments.filter(p => p.status === 'completed');
  const totalPaid = completedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const lastPayment = payments.length > 0 ? payments[payments.length - 1] : null;

  // Sort by hire date (assuming created_at or hire_date field)
  const sortedByDate = [...employees].sort((a, b) => {
    const dateA = new Date(a.created_at || a.hire_date || '1970-01-01');
    const dateB = new Date(b.created_at || b.hire_date || '1970-01-01');
    return dateB.getTime() - dateA.getTime();
  });

  const newestEmployee = sortedByDate[0];
  const oldestEmployee = sortedByDate[sortedByDate.length - 1];

  return {
    totalEmployees: employees.length,
    totalPayroll,
    avgSalary,
    highestPaid,
    lowestPaid,
    newestEmployee,
    oldestEmployee,
    departmentBreakdown,
    salaryRange,
    totalPaid,
    lastPayment,
    completedPayments: completedPayments.length,
    pendingPayments: payments.filter(p => p.status === 'pending').length,
    companyDescription: `${companyName} is an innovative blockchain-based payroll company using Stellar and XLM for secure, fast, and transparent employee payments. We leverage cutting-edge blockchain infrastructure to revolutionize how businesses handle payroll operations.`
  };
};

const handleCompanyIntelligence = (message: string, context: AIContext): string | null => {
  const analysis = analyzeMessage(message);
  const analytics = generateCompanyAnalytics(context);

  console.log('🏢 Company Intelligence Analysis:', { analysis, analytics });

  // Basic conversational responses
  if (/(thank you|thanks|thx|appreciate|great|awesome|perfect|excellent)/i.test(message) && message.length < 50) {
    const responses = [
      "You're welcome! Happy to help with your business intelligence needs. Anything else you'd like to know about your company or Stellar/XLM?",
      "Glad I could help! I'm here whenever you need insights about your employees, payroll, or crypto market data.",
      "My pleasure! Feel free to ask me anything about your business operations or Stellar/XLM blockchain.",
      "You're welcome! I'm always ready to dive into your company data or provide market analysis."
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  // Simple greetings
  if (/(^hi$|^hello$|^hey$|good morning|good afternoon|good evening)/i.test(message.trim())) {
    return "Hello! I'm your smart AI assistant with deep knowledge about your company data, payroll operations, and Stellar blockchain technology with XLM. I can analyze your employee data, provide payment insights, explain blockchain concepts, and have natural conversations. What would you like to know?";
  }

  // Salary overview questions - catch various forms including "Employee salary breakdown"
  if (/overview.*(salary|salaries|pay|compensation)/i.test(message) ||
    /salary.*(overview|breakdown|summary)/i.test(message) ||
    /(salary|salaries).*(overview|breakdown|list)/i.test(message) ||
    /employee.*salary.*breakdown/i.test(message) ||
    /(breakdown|overview).*salary/i.test(message)) {

    const employeeList = context.employees
      .sort((a, b) => (b.salary || 0) - (a.salary || 0))
      .map((emp, index) =>
        `${index + 1}. **${emp.name}** - ${emp.designation} (${emp.department}) - $${emp.salary?.toLocaleString()}`
      )
      .join('\n');

    return `💰 **Salary Overview**

**Company Salary Stats:**
• Total Employees: ${analytics.totalEmployees}
• Total Monthly Payroll: $${analytics.totalPayroll.toLocaleString()}
• Average Salary: $${analytics.avgSalary.toLocaleString()}
• Salary Range: $${analytics.salaryRange.min.toLocaleString()} - $${analytics.salaryRange.max.toLocaleString()}
• Salary Spread: $${(analytics.salaryRange.max - analytics.salaryRange.min).toLocaleString()}

**Employee List (by salary):**
${employeeList}

**Department Salary Breakdown:**
${Object.entries(analytics.departmentBreakdown)
        .map(([dept, data]) => `• **${dept}**: ${data.count} employees, avg $${data.avgSalary.toLocaleString()}, total $${data.totalSalary.toLocaleString()}`)
        .join('\n')}

**Key Insights:**
• Highest earner makes ${((analytics.highestPaid?.salary || 0) / (analytics.lowestPaid?.salary || 1) * 100).toFixed(0)}% more than lowest earner
• ${Object.keys(analytics.departmentBreakdown).length} departments represented`;
  }

  // Company name questions
  if (analysis.topics.includes('name') || /what.*(company|business).*name/i.test(message)) {
    return `🏢 **Company Name:** ${context.companyName}

${analytics.companyDescription}

We currently have ${analytics.totalEmployees} employees and have processed ${analytics.completedPayments} successful payments using Stellar blockchain and XLM.`;
  }

  // Company overview - catch "company overview please" - CHECK THIS FIRST before other overview checks
  if (/company.*overview/i.test(message) ||
    /overview.*company/i.test(message) ||
    /company.*summary/i.test(message) ||
    (analysis.topics.includes('overview') && analysis.topics.includes('company'))) {
    return `# 🏢 **${context.companyName} - Company Overview**

${analytics.companyDescription}

## 📊 **Current Operations:**

- **${analytics.totalEmployees}** active employees
- **$${analytics.totalPayroll.toLocaleString()}** total monthly payroll
- **${analytics.completedPayments}** payments processed
- **${Object.keys(analytics.departmentBreakdown).length}** departments

## 🚀 **Key Services:**

- Blockchain-based payroll processing
- Ethereum-powered employee payments with MNEE stablecoin
- Secure & transparent salary distribution
- Real-time payment tracking
- Crypto payroll solutions

## 💰 **Payroll Statistics:**

- Average salary: $${analytics.avgSalary.toLocaleString()}
- Salary range: $${analytics.salaryRange.min.toLocaleString()} - $${analytics.salaryRange.max.toLocaleString()}
- Total paid: $${analytics.totalPaid.toLocaleString()}

## 📁 **Department Breakdown:**

${Object.entries(analytics.departmentBreakdown)
        .map(([dept, data]) => `• **${dept}**: ${data.count} employees, avg $${data.avgSalary.toLocaleString()}, total $${data.totalSalary.toLocaleString()}`)
        .join('\n')}`;
  }

  // What does the company do
  if (analysis.topics.includes('business_type') || /what.*(company|business).*(do|does)/i.test(message)) {
    return `# 🚀 What ${context.companyName} Does:

${analytics.companyDescription}

## Key Services:

- Blockchain-based payroll processing
- Stellar-powered employee payments with XLM
- Secure & transparent salary distribution
- Real-time payment tracking
- Crypto payroll solutions

## Current Operations:

- ${analytics.totalEmployees} active employees
- $${analytics.totalPayroll.toLocaleString()} total monthly payroll
- ${analytics.completedPayments} payments processed
- ${Object.keys(analytics.departmentBreakdown).length} departments`;
  }

  // Employee count - catch "how many employees do we have"
  if ((analysis.topics.includes('count') && analysis.topics.includes('employees')) ||
    /how many.*(employee|staff|worker)/i.test(message) ||
    /(employee|staff|worker).*count/i.test(message)) {
    return `👥 **Employee Count:** ${analytics.totalEmployees} employees

**Department Breakdown:**
${Object.entries(analytics.departmentBreakdown)
        .map(([dept, data]) => `• ${dept}: ${data.count} employees (avg salary: $${data.avgSalary.toLocaleString()})`)
        .join('\n')}

**Payroll Overview:**
• Total monthly payroll: $${analytics.totalPayroll.toLocaleString()}
• Average salary: $${analytics.avgSalary.toLocaleString()}`;
  }

  // Highest paid employee - catch "who is our highest paid employee"
  if ((analysis.topics.includes('highest') && analysis.topics.includes('paid')) ||
    /who.*(highest|top).*(paid|earner|employee|salary)/i.test(message) ||
    /(highest|top).*(paid|earner|employee|salary)/i.test(message)) {
    if (!analytics.highestPaid) {
      return "I don't have information about employee salaries at the moment.";
    }

    return `# 💰 Highest Paid Employee: ${analytics.highestPaid.name}

## Position: ${analytics.highestPaid.designation}
## Department: ${analytics.highestPaid.department}
## Salary: $${analytics.highestPaid.salary?.toLocaleString()}
## Percentage of total payroll: ${((analytics.highestPaid.salary || 0) / analytics.totalPayroll * 100).toFixed(1)}%

This represents our top compensation tier, ${(((analytics.highestPaid.salary || 0) / analytics.avgSalary - 1) * 100).toFixed(0)}% above average salary.`;
  }

  // Lowest paid employee
  if ((analysis.topics.includes('lowest') && analysis.topics.includes('employees')) ||
    /lowest.*(paid|salary|employee)/i.test(message)) {
    if (!analytics.lowestPaid) {
      return "No employee data available yet.";
    }
    return `📊 **Lowest Paid Employee:** ${analytics.lowestPaid.name}

• **Position:** ${analytics.lowestPaid.designation}
• **Department:** ${analytics.lowestPaid.department}
• **Salary:** $${analytics.lowestPaid.salary?.toLocaleString()}
• **Percentage of total payroll:** ${((analytics.lowestPaid.salary / analytics.totalPayroll) * 100).toFixed(1)}%

This represents our entry-level compensation, ${((1 - analytics.lowestPaid.salary / analytics.avgSalary) * 100).toFixed(0)}% below average salary.`;
  }

  // Newest employee
  if (analysis.topics.includes('newest') && analysis.topics.includes('employees')) {
    if (!analytics.newestEmployee) {
      return "No employee data available yet.";
    }
    return `🆕 **Newest Employee:** ${analytics.newestEmployee.name}

• **Position:** ${analytics.newestEmployee.designation}
• **Department:** ${analytics.newestEmployee.department}
• **Salary:** $${analytics.newestEmployee.salary?.toLocaleString()}
• **Joined:** ${new Date(analytics.newestEmployee.created_at || analytics.newestEmployee.hire_date || '').toLocaleDateString()}

Welcome to our growing team! They're earning ${analytics.newestEmployee.salary > analytics.avgSalary ? 'above' : 'below'} average salary.`;
  }

  // Employee list/overview
  if ((analysis.topics.includes('overview') && analysis.topics.includes('employees')) ||
    /list.*(employee|staff)/i.test(message) ||
    /(employee|salary).*(breakdown|overview)/i.test(message)) {

    const employeeList = context.employees
      .sort((a, b) => (b.salary || 0) - (a.salary || 0))
      .map((emp, index) =>
        `${index + 1}. **${emp.name}** - ${emp.designation} (${emp.department}) - $${emp.salary?.toLocaleString()}`
      )
      .join('\n');

    return `👥 **Complete Employee Overview**

**Company Stats:**
• Total Employees: ${analytics.totalEmployees}
• Total Payroll: $${analytics.totalPayroll.toLocaleString()}/month
• Average Salary: $${analytics.avgSalary.toLocaleString()}
• Salary Range: $${analytics.salaryRange.min.toLocaleString()} - $${analytics.salaryRange.max.toLocaleString()}

**Employee List (by salary):**
${employeeList}

**Department Summary:**
${Object.entries(analytics.departmentBreakdown)
        .map(([dept, data]) => `• ${dept}: ${data.count} employees, $${data.totalSalary.toLocaleString()} total`)
        .join('\n')}`;
  }

  // Last payment info - catch "when was the last payment"
  if (/last.*(payment|paid)/i.test(message) ||
    /when.*(last|recent).*(payment|paid)/i.test(message) ||
    /when.*was.*(payment|paid)/i.test(message) ||
    analysis.topics.includes('payroll')) {
    if (!analytics.lastPayment) {
      return "No payments have been made yet.";
    }
    const paymentDate = new Date(analytics.lastPayment.created_at || analytics.lastPayment.payment_date || '');

    // Calculate time ago
    const now = new Date();
    const diffMs = now.getTime() - paymentDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    let timeAgo = 'Just now';
    if (diffMins >= 1 && diffMins < 60) {
      timeAgo = `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      timeAgo = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      timeAgo = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else {
      timeAgo = `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
    }

    return `💳 **Last Payment Information:**

• **Amount:** $${analytics.lastPayment.amount?.toLocaleString()} ${analytics.lastPayment.token || 'XLM'}
• **Employee:** ${analytics.lastPayment.employee_name || 'N/A'}
• **Date:** ${paymentDate.toLocaleDateString()} at ${paymentDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
• **Time Ago:** ${timeAgo}
• **Status:** ${analytics.lastPayment.status}
${analytics.lastPayment.transaction_hash ? `• **Transaction Hash:** [${analytics.lastPayment.transaction_hash.substring(0, 10)}...](https://stellar.expert/explorer/public/tx/${analytics.lastPayment.transaction_hash})` : ''}

**Payment Summary:**
• Total Payments Completed: ${analytics.completedPayments}
• Total Amount Paid: $${analytics.totalPaid.toLocaleString()}
• Pending Payments: ${analytics.pendingPayments}`;
  }

  // Average salary
  if (analysis.topics.includes('average') && analysis.topics.includes('salary')) {
    return `📊 **Average Salary Analysis:**

• **Company Average:** $${analytics.avgSalary.toLocaleString()}
• **Salary Range:** $${analytics.salaryRange.min.toLocaleString()} - $${analytics.salaryRange.max.toLocaleString()}
• **Spread:** $${(analytics.salaryRange.max - analytics.salaryRange.min).toLocaleString()}

**Department Averages:**
${Object.entries(analytics.departmentBreakdown)
        .map(([dept, data]) => `• ${dept}: $${data.avgSalary.toLocaleString()} (${data.count} employees)`)
        .join('\n')}`;
  }

  return null;
}; 