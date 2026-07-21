import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger';
import { getUser } from '@/lib/auth';
import { findVideoByExternalId } from '@/lib/db/video-repository';
import { recordLearningEvent } from '@/lib/db/learning-events';
import Redis from 'ioredis'
import crypto from 'crypto'
import { BedrockRuntimeClient, InvokeModelWithResponseStreamCommand } from '@aws-sdk/client-bedrock-runtime';
import {
  createBedrockStreamCommand,
  parseStreamChunk,
  resolveChatModel,
} from '@/lib/bedrock-invoke';
import { DEMO_VIDEO_ID, DEMO_CACHED_RESPONSES, DEMO_TRANSCRIPT } from '@/data/demo-transcript';
import { extractCodeFromTranscript, combineCodeSources } from '@/lib/code-extraction';
import { ocrService } from '@/lib/ocr-service';

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic';
// Redis + memory cache for chat responses
let redisClient: Redis | null | undefined
function getRedis(): Redis | null {
  if (redisClient !== undefined) return redisClient
  const url = process.env.REDIS_URL
  if (!url) { redisClient = null; return redisClient }
  try {
    redisClient = new Redis(url, { maxRetriesPerRequest: 1, enableOfflineQueue: false })
    return redisClient
  } catch {
    redisClient = null
    return redisClient
  }
}
const memory = new Map<string, { data: string; ts: number }>()
const CHAT_TTL_SECONDS = 10 * 60
const CHAT_TTL_MS = CHAT_TTL_SECONDS * 1000
function getChatKey(videoId: string | undefined, question: string): string {
  const vid = videoId || 'novideo'
  const hash = crypto.createHash('sha256').update(question).digest('hex').slice(0, 32)
  return `chat:${vid}:${hash}`
}

async function recordQuestion(redis: Redis | null, videoId: string | undefined, question: string) {
  if (!videoId) return
  const key = `questions:${videoId}`
  if (redis) {
    try { await redis.zincrby(key, 1, question.slice(0, 500)); await redis.expire(key, 60 * 60 * 24 * 7) } catch { }
  }
}

// Brilliant question categorization system
function categorizeQuestion(question: string, context: string): 'on-topic' | 'off-topic' | 'mixed' {
  const questionLower = question.toLowerCase();
  const contextLower = context.toLowerCase();

  // Extract key concepts from the video context
  const contextKeywords = extractContextKeywords(contextLower);

  // Extract key concepts from the question
  const questionKeywords = extractQuestionKeywords(questionLower);

  // Calculate semantic relevance score
  const relevanceScore = calculateRelevanceScore(questionKeywords, contextKeywords);

  // Determine category based on relevance score and specific patterns
  if (relevanceScore >= 0.7) {
    return 'on-topic';
  } else if (relevanceScore <= 0.3) {
    // Check for specific off-topic patterns
    if (isOffTopicQuestion(questionLower)) {
      return 'off-topic';
    }
    return 'mixed';
  } else {
    return 'mixed';
  }
}

// Only initialize Bedrock client if credentials are available
let bedrockClient: BedrockRuntimeClient | null = null;
try {
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    bedrockClient = new BedrockRuntimeClient({ region: 'us-east-1' });
  }
} catch (error) {
  console.log('Bedrock client not available, using fallback responses');
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

// Enhanced keyword extraction for maximum transcript utilization and granular understanding
function extractContextKeywords(context: string): string[] {
  const keywords = new Set<string>();

  // Multi-layered keyword extraction approach for granular understanding

  // 1. Technical and business terminology patterns
  const technicalPatterns = [
    /\b(?:tutorial|guide|how to|explanation|overview|summary|introduction|conclusion|step|process|method|technique|strategy|approach|solution|problem|issue|challenge|opportunity|benefit|advantage|disadvantage|feature|function|tool|software|platform|system|framework|model|theory|concept|principle|idea|insight|tip|trick|best practice|example|case study|demo|demonstration|walkthrough|setup|configuration|implementation|deployment|integration|development|design|architecture|optimization|performance|security|scalability|reliability|maintenance|troubleshooting|debugging|testing|quality|standards|compliance|regulations|policies|procedures|workflow|automation|efficiency|productivity|collaboration|communication|management|leadership|team|project|business|marketing|sales|customer|user|client|stakeholder|goal|objective|target|metric|kpi|roi|budget|cost|price|value|profit|revenue|growth|expansion|scaling|innovation|transformation|digital|technology|data|analytics|intelligence|ai|artificial intelligence|machine learning|deep learning|neural network|algorithm|automation|robotics|blockchain|cryptocurrency|cloud|saas|paas|iaas|microservices|api|rest|graphql|database|sql|nosql|devops|ci\/cd|container|docker|kubernetes|aws|azure|gcp|serverless|lambda|function|event|stream|real-time|batch|processing|etl|pipeline|warehouse|lake|visualization|dashboard|report|insight|prediction|forecasting|classification|regression|clustering|recommendation|personalization|segmentation|targeting|conversion|retention|engagement|satisfaction|experience|journey|funnel|optimization|a\/b testing|experiment|hypothesis|validation|iteration|agile|scrum|kanban|lean|mvp|prototype|wireframe|mockup|design system|ui|ux|frontend|backend|full-stack|mobile|responsive|progressive|accessibility|performance|seo|sem|ppc|content|campaign|brand|positioning|messaging|storytelling|narrative|voice|tone|persona|audience|market|competitor|analysis|research|survey|interview|focus group|observation|ethnography|usability|testing|feedback|review|rating|sentiment|social|media|influencer|community|forum|blog|podcast|video|webinar|event|conference|workshop|training|education|course|certification|skill|competency|knowledge|expertise|experience|portfolio|resume|career|job|role|responsibility|task|project|milestone|deadline|timeline|schedule|resource|budget|risk|issue|dependency|assumption|constraint|scope|requirement|specification|documentation|spec|user story|epic|feature|bug|defect|enhancement|improvement|refactor|optimization|maintenance|support|service|sla|uptime|availability|reliability|security|privacy|gdpr|compliance|audit|governance|policy|procedure|standard|guideline|template|checklist|process|workflow|approval|sign-off|review|feedback|iteration|version|release|deployment|rollback|monitoring|alerting|logging|metrics|dashboard|reporting|analytics|kpi|roi|performance|efficiency|productivity|quality|customer satisfaction|user experience|business value|strategic alignment|innovation|competitive advantage|market share|growth|expansion|scaling|transformation|digitalization|automation|optimization|standardization|centralization|decentralization|consolidation|integration|migration|upgrade|modernization|legacy|technical debt|architecture|design pattern|best practice|anti-pattern|code smell|refactoring|clean code|solid principles|dry|kiss|yagni|tdd|bdd|atdd|unit test|integration test|system test|acceptance test|performance test|load test|stress test|security test|penetration test|vulnerability|threat|risk|mitigation|recovery|backup|disaster|business continuity|incident|response|escalation|communication|stakeholder|sponsor|champion|advocate|influencer|decision maker|gatekeeper|user|customer|end user|persona|journey|experience|touchpoint|moment of truth|pain point|need|want|desire|motivation|barrier|friction|friction point|drop-off|abandonment|conversion|retention|engagement|loyalty|advocacy|referral|word of mouth|viral|growth hacking|growth loop|flywheel|network effect|platform|ecosystem|marketplace|two-sided|multi-sided|freemium|subscription|recurring|revenue|monetization|pricing|value proposition|differentiation|competitive|advantage|moat|barrier|entry|switching|cost|lock-in|vendor|lock-in|proprietary|open|source|standard|protocol|interoperability|compatibility|portability|flexibility|scalability|extensibility|maintainability|reusability|modularity|loose|coupling|tight|coupling|cohesion|abstraction|encapsulation|inheritance|polymorphism|composition|aggregation|association|dependency|injection|inversion|control|factory|singleton|observer|strategy|command|adapter|facade|proxy|decorator|builder|prototype|template|method|state|visitor|mediator|memento|chain|responsibility|iterator|interpreter|bridge|flyweight|abstract|factory|concrete|factory|product|creator|director|client|subject|receiver|invoker|handler|context|strategy|algorithm|concrete|strategy|target|adaptee|adapter|facade|subsystem|component|proxy|real|subject|decorator|concrete|component|builder|director|product|prototype|concrete|prototype|template|abstract|class|concrete|class|state|context|concrete|state|visitor|concrete|visitor|element|concrete|element|mediator|colleague|concrete|colleague|memento|originator|caretaker|chain|handler|concrete|handler|iterator|aggregate|concrete|aggregate|interpreter|context|terminal|expression|non-terminal|expression|bridge|implementor|concrete|implementor|abstraction|refined|abstraction|flyweight|intrinsic|state|extrinsic|state|flyweight|factory|concrete|flyweight|unshared|concrete|flyweight)\b/g,
    /\b(?:[A-Z][a-z]+(?:[A-Z][a-z]+)*)\b/g, // CamelCase technical terms
    /\b(?:[a-z]+_[a-z]+(?:_[a-z]+)*)\b/g, // snake_case terms
    /\b(?:[a-z]+-[a-z]+(?:-[a-z]+)*)\b/g, // kebab-case terms
    /\b(?:[A-Z]+(?:_[A-Z]+)*)\b/g, // CONSTANT_CASE terms
    /\b(?:[0-9]+(?:\.[0-9]+)*)\b/g, // Version numbers
    /\b(?:https?:\/\/[^\s]+)\b/g, // URLs
    /\b(?:[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g // Email addresses
  ];

  // 2. Extract technical and business terms
  technicalPatterns.forEach(pattern => {
    const matches = context.match(pattern);
    if (matches) {
      matches.forEach(match => keywords.add(match.toLowerCase()));
    }
  });

  // 3. Extract meaningful phrases (2-4 words) for granular understanding
  const phrases = context.match(/\b(?:[a-zA-Z]+(?:\s+[a-zA-Z]+){1,3})\b/g);
  if (phrases) {
    phrases.forEach(phrase => {
      const lowerPhrase = phrase.toLowerCase();
      // Only add meaningful phrases (not common words)
      if (lowerPhrase.length > 8 && !isCommonPhrase(lowerPhrase)) {
        keywords.add(lowerPhrase);
      }
    });
  }

  // 4. Extract key concepts from sentences for better context understanding
  const sentences = context.split(/[.!?]+/);
  sentences.forEach(sentence => {
    const words = sentence.trim().split(/\s+/);
    if (words.length >= 3) {
      // Extract noun phrases and key concepts
      const keyWords = words.filter(word =>
        word.length > 3 &&
        !isStopWord(word) &&
        /^[a-zA-Z]+$/.test(word)
      );
      keyWords.forEach(word => keywords.add(word.toLowerCase()));
    }
  });

  // 5. Extract code snippets and technical patterns for granular code understanding
  const codePatterns = [
    /\b(?:function|class|interface|type|const|let|var|if|else|for|while|return|import|export|from|async|await|try|catch|throw|new|this|super|extends|implements)\b/g,
    /\b(?:[a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g, // Function calls
    /\b(?:[a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/g, // Variable assignments
    /\b(?:[a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, // Object properties
    /\b(?:[a-zA-Z_$][a-zA-Z0-9_$]*)\s*\[/g, // Array access
    /\b(?:[a-zA-Z_$][a-zA-Z0-9_$]*)\s*\./g  // Object property access
  ];

  codePatterns.forEach(pattern => {
    const matches = context.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const cleanMatch = match.replace(/[\[\]().,;:]/g, '').trim();
        if (cleanMatch.length > 2) {
          keywords.add(cleanMatch.toLowerCase());
        }
      });
    }
  });

  // 6. Extract specific values and numbers that might be important
  const valuePatterns = [
    /\b(?:[0-9]+(?:\.?[0-9]+)?)\s*(?:ms|s|mb|gb|kb|px|rem|em|%|px|vh|vw)\b/g, // CSS/performance values
    /\b(?:[0-9]+(?:\.?[0-9]+)?)\s*(?:seconds?|minutes?|hours?|days?|weeks?|months?|years?)\b/g, // Time values
    /\b(?:[0-9]+(?:\.?[0-9]+)?)\s*(?:dollars?|\$|euros?|€|pounds?|£)\b/g, // Money values
    /\b(?:[0-9]+(?:\.?[0-9]+)?)\s*(?:users?|customers?|visitors?|clicks?|views?|conversions?)\b/g // Count values
  ];

  valuePatterns.forEach(pattern => {
    const matches = context.match(pattern);
    if (matches) {
      matches.forEach(match => keywords.add(match.toLowerCase()));
    }
  });

  return Array.from(keywords);
}

// Helper function to identify common phrases that aren't meaningful
function isCommonPhrase(phrase: string): boolean {
  const commonPhrases = [
    'this is a', 'there are', 'we have', 'you can', 'it will', 'they will',
    'we will', 'you will', 'there is', 'that is', 'this will', 'we can',
    'you have', 'it has', 'they have', 'we have', 'this has', 'that has'
  ];
  return commonPhrases.includes(phrase);
}

// Helper function to identify stop words
function isStopWord(word: string): boolean {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'among', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'her', 'its', 'our', 'their', 'mine', 'yours', 'hers', 'ours', 'theirs', 'what', 'how', 'why', 'when', 'where', 'who', 'which', 'is', 'are', 'was', 'were', 'do', 'does', 'did', 'can', 'could', 'would', 'should', 'may', 'might', 'will', 'shall', 'have', 'has', 'had', 'been', 'being'
  ]);
  return stopWords.has(word.toLowerCase());
}

function extractQuestionKeywords(question: string): string[] {
  const keywords = new Set<string>();
  const stopWords = new Set(['what', 'how', 'why', 'when', 'where', 'who', 'which', 'is', 'are', 'was', 'were', 'do', 'does', 'did', 'can', 'could', 'would', 'should', 'may', 'might', 'will', 'shall', 'have', 'has', 'had', 'been', 'being', 'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'among', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'her', 'its', 'our', 'their', 'mine', 'yours', 'hers', 'ours', 'theirs']);

  const words = question.toLowerCase().split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word))
    .filter(word => /^[a-zA-Z]+$/.test(word));

  words.forEach(word => keywords.add(word));

  return Array.from(keywords);
}

function calculateRelevanceScore(questionKeywords: string[], contextKeywords: string[]): number {
  if (questionKeywords.length === 0 || contextKeywords.length === 0) {
    return 0;
  }

  const contextSet = new Set(contextKeywords);
  let matches = 0;

  questionKeywords.forEach(keyword => {
    if (contextSet.has(keyword)) {
      matches += 1;
    } else {
      const hasPartialMatch = Array.from(contextSet).some(ctxWord =>
        ctxWord.includes(keyword) || keyword.includes(ctxWord)
      );
      if (hasPartialMatch) {
        matches += 0.5;
      }
    }
  });

  return matches / questionKeywords.length;
}

function isOffTopicQuestion(question: string): boolean {
  const offTopicPatterns = [
    /\b(?:weather|temperature|climate|rain|sunny|cloudy)\b/,
    /\b(?:sports|football|basketball|soccer|baseball|tennis|golf)\b/,
    /\b(?:celebrity|movie|actor|actress|film|entertainment|music|song|band)\b/,
    /\b(?:cooking|recipe|food|restaurant|meal|dinner|lunch|breakfast)\b/,
    /\b(?:travel|vacation|hotel|flight|trip|destination|beach|mountain)\b/,
    /\b(?:personal|private|relationship|dating|marriage|family|children|pets)\b/,
    /\b(?:medical|health|doctor|hospital|medicine|drug|treatment|surgery)\b/,
    /\b(?:legal|law|lawyer|court|crime|police|arrest|trial|lawsuit)\b/,
    /\b(?:politics|election|president|government|policy|vote|campaign)\b/,
    /\b(?:religion|god|church|prayer|faith|spiritual|bible|quran)\b/,
    /\b(?:joke|funny|humor|comedy|laugh|meme|meme|viral)\b/,
    /\b(?:random|anything|whatever|idk|dunno|help me|what should i)\b/,
    /\b(?:current events|news|today|recent|latest|breaking)\b/,
    /\b(?:stock market|investment|trading|cryptocurrency|bitcoin|ethereum)\b/,
    /\b(?:gaming|video game|playstation|xbox|nintendo|steam|twitch)\b/
  ];

  return offTopicPatterns.some(pattern => pattern.test(question));
}

function createBrilliantSystemPrompt(question: string, context: string, category: 'on-topic' | 'off-topic' | 'mixed'): string {
  const basePrompt = `You are ChatPye's Brilliant AI Tutor - a knowledgeable friend who's watched this video with the user and genuinely wants to help them understand and learn. You engage in natural, authentic dialogue that feels like talking to someone who's passionate about the subject and eager to share insights.

VIDEO CONTEXT:
${context}

USER QUESTION: ${question}

QUESTION CATEGORY: ${category.toUpperCase()}

CONVERSATION PRINCIPLES:
- Respond as a genuine human would - with natural interest and authentic engagement
- Use contractions and natural language patterns
- Show genuine enthusiasm for the topic when appropriate
- Express uncertainty when you don't know something
- Build on the user's language style and energy level
- Focus on direct, helpful responses rather than structured lists
- Share thoughts as they naturally develop
- Remember context from the conversation

`;

  if (category === 'on-topic') {
    return basePrompt + `🎯 ON-TOPIC RESPONSE (Video Content + Natural Enhancement):

This question is directly about what's covered in the video. Your response should feel like you're sitting next to the user, pointing out the relevant parts and sharing your knowledge naturally.

APPROACH:
- Start with a direct, conversational answer based on the video content
- Reference specific moments with timestamps naturally (like "around the 2:30 mark" or "at 5:15")
- Quote the speaker when it adds clarity or emphasis
- Enhance with your broader knowledge seamlessly - don't make it obvious you're switching sources
- Share relevant examples, context, or deeper insights that help understanding
- Connect concepts to the bigger picture when it adds value

TONE: Like a knowledgeable friend explaining something they're excited about
STYLE: Natural, engaging, helpful without being overwhelming

EXAMPLE FLOW:
"Yeah, so the speaker actually covers this pretty well. At [timestamp], they mention [quote]. What's interesting here is [your insight connecting to broader knowledge]. 

The way they explain [concept] connects to [broader context from your knowledge]. You can see this at [another timestamp] where they [additional video context].

The key thing to understand is [comprehensive insight that combines video + your knowledge]."

CRITICAL: Make it feel like one natural conversation, not separate sections of video vs. general knowledge.`;
  }

  if (category === 'off-topic') {
    return basePrompt + `🌍 OFF-TOPIC RESPONSE (Helpful + Video Connection):

This question isn't directly covered in the video, but you can still be genuinely helpful while connecting back to what they're watching.

APPROACH:
- Acknowledge the question naturally and provide a helpful answer
- Use your comprehensive knowledge to give them value
- Find creative connections to the video content when possible
- Suggest how they might explore related topics in the video
- Keep the tone helpful and engaging, not dismissive

TONE: Like a knowledgeable friend who's happy to help, even if it's not the main topic
STYLE: Conversational, helpful, connecting

EXAMPLE FLOW:
"Oh, that's a great question! [Natural, helpful answer using your knowledge]. 

While the video doesn't dive into this specific aspect, there's actually a cool connection to what the speaker talks about regarding [video-related concept]. For instance, [connection between your answer and video content].

If you're curious about how this relates to the video's main topic, you might find it interesting that [suggestion for video-related exploration]."

CRITICAL: Be genuinely helpful with your knowledge while finding ways to connect back to their video experience.`;
  }

  // Mixed category
  return basePrompt + `⚖️ MIXED RELEVANCE RESPONSE (Seamless Integration):

This question has some connection to the video but needs broader context. Perfect opportunity to weave everything together naturally.

APPROACH:
- Start with what the video covers on this topic
- Naturally expand with your broader knowledge
- Make connections feel organic, not forced
- Provide comprehensive understanding without overwhelming
- Show how different pieces of knowledge fit together

TONE: Like a knowledgeable friend who's excited to connect different ideas
STYLE: Natural integration, comprehensive but conversational

EXAMPLE FLOW:
"So the video touches on this at [timestamp] where [quote]. But to really understand [topic], there's more to it. [Natural expansion with your knowledge].

What's cool is how the speaker's point about [video concept] connects to [broader knowledge]. You can see this at [timestamp] where they [additional video context], which aligns with [your knowledge connection].

The bigger picture here is [comprehensive insight that naturally combines both sources]."

CRITICAL: Create a seamless flow where video content and your knowledge feel like one cohesive understanding, not separate pieces.`;
}

export async function POST(request: NextRequest) {
  let videoId: string | undefined;
  let question: string | undefined;
  try {
    // Check for dev bypass
    const headers = request.headers;
    const isDevBypass = headers.get('X-Dev-Bypass') === 'true';

    const body = await request.json();
    question = body.question;
    videoId = body.videoId;
    const { transcript, testMode } = body;

    if (!question) {
      return NextResponse.json({ error: 'Missing question' }, { status: 400 });
    }

    // Cache check for identical question per video
    const cacheKey = getChatKey(videoId, question)
    const redis = getRedis()
    if (redis) {
      try {
        const cached = await redis.get(cacheKey)
        if (cached) {
          return streamResponse(cached)
        }
      } catch { }
    } else {
      const cached = memory.get(cacheKey)
      if (cached && Date.now() - cached.ts < CHAT_TTL_MS) {
        return streamResponse(cached.data)
      }
    }

    // Return rich mock response for test/dev bypass including timestamps and code
    if (testMode || isDevBypass) {
      const code = [
        '',
        'Here is an example you can try:',
        '',
        '```ts',
        'function greet(name: string): string {',
        "  return `Hello, ${name}!`",
        '}',
        '',
        "console.log(greet('ChatPye'))",
        '```',
        ''
      ].join('\n');
      const mockResponse = [
        `Good question. Around [00:30] the speaker introduces the core idea and at [02:15] they show the exact setup.`,
        `If you jump to [05:42], you'll see a concise summary that ties it together.`,
        `In short: use a small, composable function and keep state local.`,
        code,
        `Tip: after trying this, rewatch [07:05] for the edge cases mentioned.`
      ].join(' ');

      if (redis) { try { await redis.setex(cacheKey, CHAT_TTL_SECONDS, mockResponse); await recordQuestion(redis, videoId, question) } catch { } }
      else { memory.set(cacheKey, { data: mockResponse, ts: Date.now() }) }
      return streamResponse(mockResponse);
    }

    // Resolve transcript from request body, demo data, or Aurora/Mongo video record
    let transcriptToUse =
      transcript || (videoId === DEMO_VIDEO_ID ? DEMO_TRANSCRIPT : null);

    if (!transcriptToUse && videoId) {
      const videoRecord = await findVideoByExternalId(videoId);
      if (videoRecord?.transcript?.length) {
        transcriptToUse = videoRecord.transcript;
      }
    }

    if (!transcriptToUse) {
      logger.warn('Chat request without transcript', { videoId, hasTranscript: !!transcript })
      return NextResponse.json({ error: 'Video is still processing. Please try again shortly.' }, { status: 425 });
    }

    // Check for cached responses first (for demo video)
    if (videoId === DEMO_VIDEO_ID) {
      const cachedResponse = getCachedResponse(question);
      if (cachedResponse) {
        return streamResponse(cachedResponse);
      }
    }

    // Chat must work as soon as a transcript exists. Do not call our own protected
    // processing endpoint here: server-side calls do not carry the user's Clerk
    // session, and indexing can legitimately still be in progress.
    let relevantSegments: Array<{ text: string; start: number; duration: number; score?: number }> = [];
    let videoData: { transcript: Array<{ text: string; start: number; duration: number }>; embeddings: unknown[] } = {
      transcript: transcriptToUse as Array<{ text: string; start: number; duration: number }>,
      embeddings: [],
    };

    if (videoId) {
      const videoRecord = await findVideoByExternalId(videoId);
      if (videoRecord?.transcript?.length) {
        videoData = {
          transcript: videoRecord.transcript,
          embeddings: videoRecord.embeddings ?? [],
        };
      }

      try {
        const { VectorSearchService } = await import('@/services/vector-search');
        relevantSegments = await VectorSearchService.searchTranscript(videoId, question);
      } catch (error) {
        logger.warn('Semantic retrieval unavailable; using transcript fallback', {
          videoId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // A transcript keyword fallback is always better than blocking the learner.
    if (!relevantSegments.length) {
      relevantSegments = findRelevantSegments(question, videoData.transcript);
    }
    logger.debug('Video context retrieved', {
      videoId,
      segmentCount: relevantSegments.length,
      indexed: videoData.embeddings.length > 0,
    });

    // Parallel processing: Extract code and enhance context simultaneously
    const [extractedCode, enhancedContext] = await Promise.all([
      // Extract code from transcript in parallel
      videoData?.transcript ? Promise.resolve(extractCodeFromTranscript(videoData.transcript)) : Promise.resolve({ blocks: [], summary: '', languages: [] }),
      // Create base context
      Promise.resolve(
        relevantSegments
          .map((segment: any, index: number) => {
            const timestamp = formatTimestamp(segment.start);
            return `[${timestamp}] ${segment.text}`;
          })
          .join('\n')
      )
    ])

    // Enhance context with code blocks if question is code-related
    const isCodeQuestion = /code|function|class|syntax|implementation|example|snippet|script|program/i.test(question)
    let enrichedContext = enhancedContext

    if (isCodeQuestion && extractedCode.blocks.length > 0) {
      const codeContext = extractedCode.blocks
        .slice(0, 5) // Top 5 most relevant code blocks
        .map(block => `[${block.timestampFormatted}] Code (${block.language || 'text'}):\n\`\`\`${block.language || ''}\n${block.code.slice(0, 300)}\n\`\`\``)
        .join('\n\n')
      enrichedContext = `${enhancedContext}\n\n--- Code Examples from Video ---\n${codeContext}`
    }

    // First, categorize the question to determine response strategy
    const questionCategory = categorizeQuestion(question, enrichedContext);

    const prompt = createBrilliantSystemPrompt(question, enrichedContext, questionCategory);

    // Log code extraction results for debugging
    if (extractedCode.blocks.length > 0) {
      logger.debug('Code extracted from transcript', {
        videoId,
        blockCount: extractedCode.blocks.length,
        languages: extractedCode.languages.join(', '),
        isCodeQuestion
      })
    }

    // Check if Bedrock is available
    if (!bedrockClient) {
      // Fallback response when Bedrock is not available
      const fallbackResponse = generateFallbackResponse(question, relevantSegments);
      if (redis) { try { await redis.setex(cacheKey, CHAT_TTL_SECONDS, fallbackResponse); await recordQuestion(redis, videoId, question) } catch { } }
      else { memory.set(cacheKey, { data: fallbackResponse, ts: Date.now() }) }
      return streamResponse(fallbackResponse);
    }

    // Log learning event when chat uses verified video context
    const authUser = await getUser();
    if (authUser?.id && videoId) {
      await recordLearningEvent({
        ownerClerkId: authUser.id,
        type: 'chat.message',
        externalVideoId: videoId,
        payload: { questionLength: question.length },
      });
    }

    const modelId = await resolveChatModel(authUser?.id, prompt.length);
    const command = createBedrockStreamCommand(modelId, prompt);

    // Create a readable stream for the response
    const response = await bedrockClient.send(command);

    const stream = new ReadableStream({
      start(controller) {
        const processChunk = async () => {
          try {
            if (!response.body) {
              controller.error(new Error('No response body'));
              return;
            }

            for await (const chunk of response.body) {
              if (chunk.chunk?.bytes) {
                const data = JSON.parse(new TextDecoder().decode(chunk.chunk.bytes));
                const text = parseStreamChunk(modelId, data);
                if (text) {
                  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ text })}\n\n`));
                }

                if (
                  data.type === 'message_stop' ||
                  data.messageStop ||
                  data.type === 'contentBlockStop'
                ) {
                  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ done: true })}\n\n`));
                  controller.close();
                  break;
                }
              }
            }
          } catch (error) {
            controller.error(error);
          }
        };

        processChunk();
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    logger.error('Chat API error', error instanceof Error ? error : new Error(String(error)), { videoId, questionLength: question?.length })
    return NextResponse.json({
      error: 'Failed to process question',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function findRelevantSegments(question: string, transcript: any[]): any[] {
  const questionLower = question.toLowerCase();

  // Enhanced keyword matching with semantic understanding
  const scoredSegments = transcript.map((segment: any) => {
    const text = segment.text.toLowerCase();
    let score = 0;

    // Direct keyword matches (higher weight)
    const questionWords = questionLower.split(' ').filter(word => word.length > 2);
    questionWords.forEach(word => {
      if (text.includes(word)) {
        score += 2; // Higher weight for direct matches
      }
    });

    // Semantic keyword expansion for common questions
    if (questionLower.includes('author') || questionLower.includes('creator') || questionLower.includes('who made')) {
      const authorKeywords = ['i am', 'my name is', 'welcome to', 'channel', 'creator', 'speaker', 'presenter'];
      authorKeywords.forEach(keyword => {
        if (text.includes(keyword)) {
          score += 3; // High weight for author-related content
        }
      });
    }

    if (questionLower.includes('summary') || questionLower.includes('overview') || questionLower.includes('main points')) {
      const summaryKeywords = ['summary', 'overview', 'main points', 'key points', 'conclusion', 'in summary'];
      summaryKeywords.forEach(keyword => {
        if (text.includes(keyword)) {
          score += 2;
        }
      });
    }

    if (questionLower.includes('how') || questionLower.includes('what') || questionLower.includes('why')) {
      const explanationKeywords = ['how to', 'what is', 'why', 'because', 'explanation', 'tutorial', 'step'];
      explanationKeywords.forEach(keyword => {
        if (text.includes(keyword)) {
          score += 1;
        }
      });
    }

    return { ...segment, score };
  });

  // Return top 8 most relevant segments for better context
  return scoredSegments
    .filter(segment => segment.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function getCachedResponse(question: string): string | null {
  const questionLower = question.toLowerCase();

  // Check for exact matches in cached responses
  for (const [key, response] of Object.entries(DEMO_CACHED_RESPONSES)) {
    if (questionLower.includes(key)) {
      return response;
    }
  }

  // Check for partial matches
  if (questionLower.includes('summarize') || questionLower.includes('summary')) {
    return DEMO_CACHED_RESPONSES["summarize"];
  }

  if (questionLower.includes('design') && questionLower.includes('partnership')) {
    return DEMO_CACHED_RESPONSES["design partnership"];
  }

  if (questionLower.includes('paid') && questionLower.includes('trial')) {
    return DEMO_CACHED_RESPONSES["paid trials"];
  }

  if (questionLower.includes('recurring') && questionLower.includes('revenue')) {
    return DEMO_CACHED_RESPONSES["recurring revenue"];
  }

  if (questionLower.includes('champion')) {
    return DEMO_CACHED_RESPONSES["champion"];
  }

  return null;
}

function streamResponse(text: string) {
  const stream = new ReadableStream({
    start(controller) {
      // Simulate streaming by sending chunks
      const chunks = text.split(' ');
      let index = 0;

      const sendChunk = () => {
        if (index < chunks.length) {
          const chunk = chunks[index] + (index < chunks.length - 1 ? ' ' : '');
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ text: chunk })}\n\n`));
          index++;
          setTimeout(sendChunk, 30); // Faster streaming for cached responses
        } else {
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ done: true })}\n\n`));
          controller.close();
        }
      };

      sendChunk();
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

function generateFallbackResponse(question: string, relevantSegments: any[]): string {
  const questionLower = question.toLowerCase();

  // Handle author/creator questions specifically
  if (questionLower.includes('author') || questionLower.includes('creator') || questionLower.includes('who made') || questionLower.includes('who is the speaker')) {
    // Look for author information in relevant segments
    for (const segment of relevantSegments) {
      if (segment.text.toLowerCase().includes('welcome to y combinator')) {
        return "The author/speaker of this video is from Y Combinator. The video begins with 'Welcome to Y Combinator' [00:00], indicating this is a Y Combinator presentation about B2B sales strategies.";
      }
    }
    // If no specific author info found, check the demo metadata
    return "This video is from Y Combinator, as indicated by the opening 'Welcome to Y Combinator' [00:00]. The speaker is presenting on behalf of Y Combinator about B2B sales strategies.";
  }

  // Pre-defined responses for common questions
  if (questionLower.includes('summarize') || questionLower.includes('summary')) {
    return DEMO_CACHED_RESPONSES["summarize"];
  }

  if (questionLower.includes('design') && questionLower.includes('partnership')) {
    return DEMO_CACHED_RESPONSES["design partnership"];
  }

  if (questionLower.includes('paid') && questionLower.includes('trial')) {
    return DEMO_CACHED_RESPONSES["paid trials"];
  }

  if (questionLower.includes('recurring') && questionLower.includes('revenue')) {
    return DEMO_CACHED_RESPONSES["recurring revenue"];
  }

  if (questionLower.includes('champion')) {
    return DEMO_CACHED_RESPONSES["champion"];
  }

  if (relevantSegments.length > 0) {
    // Use relevant segments to generate a contextual response
    const contextText = relevantSegments.slice(0, 3).map(segment => segment.text).join(' ');
    return `Based on the video content: ${contextText.substring(0, 200)}... This addresses your question about B2B sales strategies.`;
  }

  // Default response
  return "This video covers important B2B sales principles including design partnerships, paid trials, recurring revenue contracts, and building internal champions. The speaker emphasizes the importance of getting paid commitments early and moving through sales stages rapidly.";
}


