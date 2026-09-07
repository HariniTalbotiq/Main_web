/* =============================================================================
   ARTICLES — published columns by Akhil Gupta, in The Edge Malaysia
   -----------------------------------------------------------------------------
   GENERATED FILE. Do not edit by hand — `node tools/fetch-articles.js` will
   overwrite it. Every field below is copied verbatim from the publisher's own
   page data (see the header of that script). Summaries are truncated by THEM,
   not by us.

   Fetched from https://theedgemalaysia.com/author/Akhil%20Gupta
   8 articles · the publisher's own total was 8 · 2 page(s) followed
   ========================================================================== */

const PUBLISHER = {
  name: "The Edge Malaysia",
  origin: "https://theedgemalaysia.com",
  authorIndex: "https://theedgemalaysia.com/author/Akhil%20Gupta",
};

/* Newest first, which is the order the publisher's own index uses. */
const ARTICLES = [
  {
    nid: 815608,
    title: "Digital Intelligence: The tokenmaxxing trap: Why cheaper AI is blowing up enterprise budgets",
    date: "2026-08-28",
    author: "Akhil Gupta",
    summary: "The unit cost of artificial intelligence tokens, the smallest unit of data processed by an artificial intelligence (AI) model, has plummeted since 2023. Yet across the corporate landscape, chief financial officers and engineering leaders are facing unexpected AI invoice shocks.\n\nOver the...",
    img: "https://assets.theedgemarkets.com/P55-AI-2-TEM1641_Forum_pixabay.jpg",
    caption: null,
    section: "Edge Weekly",
  },
  {
    nid: 805615,
    title: "Digital Intelligence: From guesswork to ground truth: The deep tech revolution in modern agriculture",
    date: "2026-06-04",
    author: "Akhil Gupta",
    summary: "The agricultural sector must transition from intuition-based farming to data-driven Agriculture 5.0, using deep tech like AI, IoT sensors, and drones to address climate change, labor shortages, and rising food production needs driven by population growth.",
    img: "https://assets.theedgemarkets.com/Agriculture_Forum_theedgemalaysia.jpg",
    caption: null,
    section: "Edge Weekly",
  },
  {
    nid: 771029,
    title: "Digital Intelligence: Beyond the human hand: The rise of AI in surgery",
    date: "2025-09-23",
    author: "Akhil Gupta, Hanafiah Harunarashid and Levin Kesu Belani",
    summary: "Artificial intelligence (AI) is revolutionising the field of surgery. AI-powered applications are now working alongside surgeons as indispensable partners, using vast datasets and advanced algorithms to provide real-time, life-saving insights. This technology isn’t just reshaping surgical procedu...",
    img: "https://assets.theedgemarkets.com/P45-surgery-TEM1593_Forum_reuters.jpg",
    caption: null,
    section: "Edge Weekly",
  },
  {
    nid: 763415,
    title: "Digital Intelligence: The AI advantage: Twin turbo for profit and purpose",
    date: "2025-07-25",
    author: "Akhil Gupta",
    summary: "The artificial intelligence (AI) revolution presents a critical dilemma: How do businesses leverage its immense power to drive profitability without compromising environmental responsibility and ethical integrity? The solution lies in consciously integrating AI as a twin-turbo engine, simultaneou...",
    img: "https://assets.theedgemarkets.com/P62-AI-TEM1584_Forum_freepik.jpg",
    caption: null,
    section: "Edge Weekly",
  },
  {
    nid: 756655,
    title: "Digital Intelligence: AI’s impact on jobs: Evolution not extinction",
    date: "2025-05-27",
    author: "Akhil Gupta",
    summary: "The robots are coming! Or so the headlines scream. The rapid, almost dizzying advancement of artificial intelligence (AI) has plunged the world into a fervent debate.\n\nAt the heart of this discourse lies a question that touches every individual, every industry and every segment of societ...",
    img: "https://assets.theedgemarkets.com/P47-AI-TEM1576_Forum_123rf.jpg",
    caption: null,
    section: "Edge Weekly",
  },
  {
    nid: 754007,
    title: "Digital Intelligence: AI-driven digital strategies can transform SMEs",
    date: "2025-05-08",
    author: "Akhil Gupta",
    summary: "Imagine the possibilities: A small and medium enterprise (SME) involved in fashion in Malaysia cut customer service calls by 40% and boosted satisfaction by 25% after adopting AI chatbots and sentiment analysis tools. Likewise, a logistics firm leveraged AI for supply chain forecasting — reducing...",
    img: "https://assets.theedgemarkets.com/P51-SMEs-TEM1573_Forum_vecteezy.jpg",
    caption: null,
    section: "Edge Weekly",
  },
  {
    nid: 750445,
    title: "Digital Intelligence: The algorithmic edge: How AI is reshaping the business landscape",
    date: "2025-04-09",
    author: "Akhil Gupta",
    summary: "Artificial intelligence (AI) is no longer a distant vision of the future; it’s a driving force in today’s global economy. PwC estimates AI could contribute US$15.7 trillion by 2030, a figure that surpasses the combined gross domestic product of India and China today.\n\nBusinesses that fai...",
    img: "https://assets.theedgemarkets.com/P49-AI-TEM1569_Forum_123rf.jpg",
    caption: "In marketing, AI enhances strategies by analysing customer behaviour for personalised experiences and tailored recommendations",
    section: "Edge Weekly",
  },
  {
    nid: 743770,
    title: "The global AI race: The new Cold War",
    date: "2025-02-08",
    author: "Akhil Gupta",
    summary: "The 20th-century Cold War was defined by nuclear weapons. Today, a new cold war is being waged, with artificial intelligence (AI) as the ultimate weapon. The stakes are arguably even higher, as nations compete for control of a technology that promises to redefine our world.",
    img: "https://assets.theedgemarkets.com/ai-chips_reuters.jpg",
    caption: null,
    section: "Opinion",
  },
];

/* The canonical article URL. The source gives an alias of "node/<nid>", and
   that is what the author index links to, so it is what we link to. */
const articleUrl = (a) => `${PUBLISHER.origin}/node/${a.nid}`;

module.exports = { PUBLISHER, ARTICLES, articleUrl };
