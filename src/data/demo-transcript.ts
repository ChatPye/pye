// Demo transcript data for the YouTubeChat component
// This is stored once and reused for all demo interactions

export const DEMO_VIDEO_ID = "DH7REvnQ1y4";

export const DEMO_VIDEO_METADATA = {
  videoId: DEMO_VIDEO_ID,
  title: "Y Combinator B2B Sales — How to Close Your First B2B Contracts",
  channel: "Y Combinator",
  views: 51000,
  thumbnail: `https://img.youtube.com/vi/${DEMO_VIDEO_ID}/hqdefault.jpg`,
  published: "2023-10-15",
  description: "Learn how to navigate the B2B sales process from design partnerships to recurring revenue contracts. Avoid common mistakes and close your first B2B deals effectively."
};

export const DEMO_TRANSCRIPT = [
  {
    text: "Welcome to Y Combinator. Today we're going to talk about B2B sales and how to close your first B2B contracts.",
    start: 0,
    duration: 5
  },
  {
    text: "The most common mistake I see B2B founders make is starting with design partnerships that become really poorly defined and overly long unpaid engagements.",
    start: 5,
    duration: 7
  },
  {
    text: "Design partnerships often last 3-6 months with low customer engagement since they're not paying. This leads to vague scope and founders getting stuck without progressing to real revenue.",
    start: 12,
    duration: 8
  },
  {
    text: "Instead, focus on narrow wedge products rather than broad platforms. Build something specific that automates a narrow piece of work in 48 hours, then sell to 10 similar customers.",
    start: 20,
    duration: 8
  },
  {
    text: "The key is getting paid commitments early. Ask about willingness to pay for the full product early, even if it's smaller amounts like $10K-$20K that can be approved on corporate credit cards.",
    start: 28,
    duration: 9
  },
  {
    text: "Paid trials require financial commitment upfront to make customers take the pilot seriously. Time frames should be as short as possible - 7-14 days - with daily check-ins.",
    start: 37,
    duration: 8
  },
  {
    text: "The pro move is recurring revenue contracts with opt-out periods. These are typically monthly or annual contracts with 30-60 day money-back guarantees.",
    start: 45,
    duration: 8
  },
  {
    text: "By default, if customers do nothing and are happy, it becomes a full contract without additional sales processes. This is very persuasive in sales meetings.",
    start: 53,
    duration: 7
  },
  {
    text: "Identify and treat your internal champion almost like a co-founder inside the company. They sell for you when you're not present and fight budget battles.",
    start: 60,
    duration: 8
  },
  {
    text: "Visit customers in person when possible and be flexible on contract terms while avoiding company-ending clauses. Set defined closing dates to create urgency.",
    start: 68,
    duration: 8
  }
];

// AI-generated summary for the Notes tab
export const DEMO_VIDEO_SUMMARY = {
  summary: "This Y Combinator presentation covers the complete B2B sales journey from initial design partnerships to closing recurring revenue contracts. The speaker outlines four key stages: 1) Design partnerships (often too long and poorly defined), 2) Free trials/pilots (need clear success metrics), 3) Paid trials (with financial commitment), and 4) Recurring revenue contracts with opt-out periods (the 'pro move'). Key insights include focusing on narrow wedge products rather than broad platforms, getting paid commitments early to ensure customer engagement, and moving through stages rapidly to close new ARR weekly.",
  keyPoints: [
    "Design partnerships are often too long (3-6 months) and poorly defined with low customer engagement",
    "Focus on narrow wedge products rather than broad platforms to avoid overbuilding",
    "Get paid commitments early to ensure customers take pilots seriously",
    "Use recurring revenue contracts with opt-out periods as the 'pro move'",
    "Identify and treat internal champions like co-founders inside the company",
    "Visit customers in person and be flexible on contract terms while avoiding company-ending clauses"
  ],
  processedAt: new Date().toISOString()
};

// Pre-computed embeddings for demo (simplified for demo purposes)
export const DEMO_EMBEDDINGS = DEMO_TRANSCRIPT.map((segment, index) => ({
  id: index,
  text: segment.text,
  start: segment.start,
  duration: segment.duration,
  // Simplified embedding representation for demo
  embedding: new Array(384).fill(0).map(() => Math.random() - 0.5)
}));

// Cached responses for common demo questions - transcript-based
export const DEMO_CACHED_RESPONSES = {
  "summarize": "This Y Combinator presentation covers the complete B2B sales journey from design partnerships to recurring revenue contracts. The speaker outlines four key stages: design partnerships (often too long and poorly defined), free trials/pilots (need clear success metrics), paid trials (with financial commitment), and recurring revenue contracts with opt-out periods (the 'pro move'). Key insights include focusing on narrow wedge products, getting paid commitments early, and moving through stages rapidly to close new ARR weekly.",
  
  "design partnership": "Design partnerships are often the first stage for B2B founders, but they frequently become 'really poorly defined and overly long unpaid' engagements lasting 3-6 months. The main problems are low customer engagement since they're not paying, vague scope, and founders getting stuck without progressing to real revenue. The speaker recommends identifying narrow pieces of work to automate, building wedge products in 48 hours, and selling to 10 similar customers rather than overbuilding.",
  
  "paid trials": "Paid trials require getting a financial commitment upfront to make customers take the pilot seriously. The speaker recommends asking about willingness to pay for the full product early, potentially accepting smaller amounts ($10K-$20K) that can be approved on corporate credit cards, and ensuring high customer engagement with daily check-ins. Time frames should be as short as possible (7-14 days) and include a post-pilot meeting to show ROI numbers.",
  
  "recurring revenue": "The 'pro move' is recurring revenue contracts with opt-out periods - typically monthly or annual contracts with 30-60 day money-back guarantees. By default, if customers do nothing and are happy, it becomes a full contract without additional sales processes. This can be very persuasive in sales meetings when you can confidently say 'this is how customers buy our product' with specific examples.",
  
  "champion": "The internal champion should be treated 'almost like a co-founder inside the company.' They sell for you when you're not present and fight budget battles. The speaker recommends setting defined closing dates (they'll miss them but it creates urgency), understanding their sales process upfront, mapping the organization (economic buyer, technical approver, security gatekeeper, legal team, day-to-day users), and visiting them in person when possible."
};
