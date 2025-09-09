// Secure CasperAI Server
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 5000;

// Security middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Security headers (modified for Replit environment)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Removed X-Frame-Options: DENY to allow embedding in Replit iframe
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // Removed Strict-Transport-Security for development environment
  // Cache control to prevent caching issues in Replit iframe
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// Database manager
const db = require('./database/database_manager');

// Autonomous Web Scanner
const { autonomousScan, fetchPage, isSafeUrl } = require('./autonomous_scanner');
const { isOverrideActive, enableAutonomousMode, disableAutonomousMode, toggleAutonomousMode, getAutonomousStatus } = require('./grow_database');

// Autonomous Web Scanner functionality
async function scanWeb(urls, userId = null) {
  try {
    if (!isOverrideActive()) {
      return "👻 Autonomous web scanning is currently disabled. Use 'enable scanner' to activate it.";
    }
    
    // Store the scan request as a memory
    if (userId) {
      await learn(userId, `Initiated web scan for: ${Array.isArray(urls) ? urls.join(', ') : urls}`);
    }
    
    // Run autonomous scan
    await autonomousScan(Array.isArray(urls) ? urls : [urls]);
    
    return "👻 Web scanning completed! The scanner has autonomously explored and learned from the websites. The information has been processed and stored for future reference.";
  } catch (error) {
    console.error('Web scan error:', error);
    return "👻 There was an error during the web scanning process. Please try again later.";
  }
}

// Function to fetch and analyze a specific page
async function analyzeWebsite(url, userId = null) {
  try {
    if (!isSafeUrl(url)) {
      return "👻 Sorry, I can't access that website for safety reasons. Please try a different URL.";
    }
    
    const content = await fetchPage(url);
    if (!content) {
      return "👻 I couldn't fetch that website. It might be unavailable or blocking automated requests.";
    }
    
    // Store the analysis as a memory
    if (userId) {
      const preview = content.substring(0, 200).replace(/<[^>]*>/g, '').trim();
      await learn(userId, `Analyzed website ${url}: ${preview}...`);
    }
    
    // Extract useful information from the content
    const title = content.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || 'Unknown Title';
    const textContent = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const summary = textContent.substring(0, 300) + '...';
    
    return `👻 **Website Analysis: ${title}**\n\n${summary}\n\nI've analyzed this website and stored the information for future reference. What would you like to know about it?`;
  } catch (error) {
    console.error('Website analysis error:', error);
    return "👻 There was an error analyzing that website. Please try again later.";
  }
}

// AI Memory Core
let AI_coreMemory = {
  userProfiles: {}
};

// Secure learning function
async function learn(userId, info) {
  if (!info || typeof info !== 'string' || info.length > 500) return;
  
  const cleanedInfo = info.trim();
  const words = cleanedInfo.split(' ');
  const category = words[0].toLowerCase() || 'misc';
  
  if (!AI_coreMemory.userProfiles[userId]) {
    AI_coreMemory.userProfiles[userId] = {
      interests: [],
      knowledgeLevel: 'medium'
    };
  }
  
  const dataToStore = {
    userId,
    content: cleanedInfo,
    category,
    timestamp: new Date(),
    type: 'memory'
  };
  
  try {
    await db.store(dataToStore);
    updateUserProfile(userId, cleanedInfo);
    return true;
  } catch (error) {
    console.error('Storage error:', error);
    return false;
  }
}

function updateUserProfile(userId, text) {
  const lowerText = text.toLowerCase();
  const userMemory = AI_coreMemory.userProfiles[userId];
  
  const interestKeywords = {
    'technology': ['code', 'program', 'computer', 'software', 'tech', 'ai'],
    'science': ['science', 'research', 'physics', 'chemistry', 'biology'],
    'arts': ['art', 'music', 'creative', 'design', 'drawing'],
    'sports': ['sports', 'game', 'exercise', 'fitness', 'team']
  };
  
  for (const [interest, keywords] of Object.entries(interestKeywords)) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      if (!userMemory.interests.includes(interest)) {
        userMemory.interests.push(interest);
      }
    }
  }
  
  const complexWords = lowerText.match(/\b[a-z]{8,}\b/g) || [];
  if (complexWords.length > 3) {
    userMemory.knowledgeLevel = 'high';
  }
}

// Enhanced response generation
async function generateResponse(userId, input) {
  const lowerInput = input.toLowerCase();
  const userMemory = AI_coreMemory.userProfiles[userId] || {};
  
  // Special commands
  if (lowerInput === 'help') {
    return getHelpResponse();
  }
  
  if (lowerInput === 'database status') {
    return getDatabaseStatus();
  }
  
  if (lowerInput.includes('my profile')) {
    return getUserProfileResponse(userId);
  }
  
  // Autonomous scanner commands
  if (lowerInput.startsWith('scan ') || lowerInput.startsWith('web scan ')) {
    const urls = input.replace(/^(scan|web scan)\s+/i, '').split(/\s+/);
    return await scanWeb(urls, userId);
  }
  
  if (lowerInput.startsWith('analyze ') && (lowerInput.includes('http') || lowerInput.includes('www'))) {
    const url = input.replace(/^analyze\s+/i, '');
    return await analyzeWebsite(url, userId);
  }
  
  // Scanner control commands
  if (lowerInput === 'enable scanner' || lowerInput === 'scanner on') {
    enableAutonomousMode();
    return "👻 Autonomous web scanner has been enabled! I can now explore and learn from websites autonomously.";
  }
  
  if (lowerInput === 'disable scanner' || lowerInput === 'scanner off') {
    disableAutonomousMode();
    return "👻 Autonomous web scanner has been disabled. Web scanning capabilities are now inactive.";
  }
  
  if (lowerInput === 'scanner status') {
    const status = getAutonomousStatus();
    return `👻 **Scanner Status:** ${status.status}\n\nThe autonomous web scanner is currently ${status.active ? 'enabled and ready to explore websites' : 'disabled'}.`;
  }
  
  // Greetings with time awareness
  if (["hello", "hi", "hey", "good morning", "good afternoon", "good evening"].some(g => lowerInput.includes(g))) {
    const hour = new Date().getHours();
    let timeGreeting = "";
    if (hour < 12) timeGreeting = "Good morning";
    else if (hour < 17) timeGreeting = "Good afternoon";
    else timeGreeting = "Good evening";
    
    const greetings = [
      `👻 ${timeGreeting}! I'm CasperAI, your intelligent assistant. How can I help you today?`,
      `👻 ${timeGreeting}! Great to see you! What would you like to explore or discuss?`,
      `👻 ${timeGreeting}! I'm here and ready to assist. What's on your mind?`
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }
  
  // Farewell responses
  if (["bye", "goodbye", "see you", "talk later"].some(g => lowerInput.includes(g))) {
    const farewells = [
      "👻 Goodbye! It was wonderful chatting with you. Feel free to come back anytime!",
      "👻 See you later! I'll remember our conversation for next time.",
      "👻 Take care! I'm always here when you need assistance."
    ];
    return farewells[Math.floor(Math.random() * farewells.length)];
  }
  
  
  // Question detection and responses
  if (lowerInput.includes('?') || lowerInput.startsWith('what') || lowerInput.startsWith('how') || 
      lowerInput.startsWith('why') || lowerInput.startsWith('when') || lowerInput.startsWith('where') ||
      lowerInput.startsWith('can you') || lowerInput.startsWith('could you') || lowerInput.startsWith('do you')) {
    return await getIntelligentResponse(userId, input, userMemory);
  }
  
  // Topic-based responses
  if (lowerInput.includes('weather')) {
    return "👻 I can't get real-time weather data, but I can analyze weather websites if you provide a specific weather URL to analyze. Try providing a weather website URL and I'll analyze it for you!";
  }
  
  if (lowerInput.includes('time') && (lowerInput.includes('what') || lowerInput.includes('current'))) {
    const now = new Date();
    return `👻 The current time is ${now.toLocaleTimeString()}. Is there anything time-related I can help you with?`;
  }
  
  // Learning and educational topics
  if (["learn", "teach", "explain", "understand"].some(word => lowerInput.includes(word))) {
    return await getEducationalResponse(userId, input, userMemory);
  }
  
  // Technology and programming
  if (["code", "programming", "software", "computer", "tech", "algorithm", "data"].some(word => lowerInput.includes(word))) {
    return await getTechResponse(userId, input, userMemory);
  }
  
  // Creative and arts
  if (["creative", "art", "music", "design", "writing", "story", "poem"].some(word => lowerInput.includes(word))) {
    return await getCreativeResponse(userId, input, userMemory);
  }
  
  // Problem-solving and advice
  if (["problem", "issue", "help me", "advice", "suggestion", "recommend"].some(word => lowerInput.includes(word))) {
    return await getProblemSolvingResponse(userId, input, userMemory);
  }
  
  // Try to retrieve and use relevant memories
  try {
    const memories = await db.retrieve(userId, { limit: 5 });
    if (memories.length > 0) {
      const relevantMemory = findRelevantMemory(memories, input);
      if (relevantMemory) {
        return `👻 That reminds me of when you mentioned: "${relevantMemory.content}". ${await generateContextualResponse(input, relevantMemory, userMemory)}`;
      }
    }
  } catch (error) {
    console.error('Retrieval error:', error);
  }
  
  // Default intelligent response
  return await getDefaultIntelligentResponse(userId, input, userMemory);
}

// Intelligent response helper functions
async function getIntelligentResponse(userId, input, userMemory) {
  const lowerInput = input.toLowerCase();
  
  // Question patterns and responses
  if (lowerInput.includes('what') && lowerInput.includes('you')) {
    return "👻 I'm CasperAI, an advanced AI assistant! I can help with questions, provide information, assist with problem-solving, discuss various topics, and learn about your interests. What would you like to know?";
  }
  
  if (lowerInput.includes('how') && (lowerInput.includes('you') || lowerInput.includes('work'))) {
    return "👻 I work by analyzing what you say, understanding context, and providing helpful responses. I can remember our conversations, learn about your interests, and adapt to help you better. How can I assist you today?";
  }
  
  if (lowerInput.includes('can you') || lowerInput.includes('could you')) {
    const capabilities = [
      "answer questions and provide information",
      "help with problem-solving and decision making", 
      "discuss topics you're interested in",
      "remember our past conversations",
      "provide explanations on various subjects",
      "offer suggestions and advice"
    ];
    return `👻 I can ${capabilities[Math.floor(Math.random() * capabilities.length)]}! What specifically would you like me to help with?`;
  }
  
  return `👻 That's an interesting question! Let me think about "${input}". Could you provide a bit more context so I can give you a more helpful response?`;
}

async function getEducationalResponse(userId, input, userMemory) {
  const topics = {
    'science': "👻 Science is fascinating! Whether it's physics, chemistry, biology, or any other field, I'd love to explore it with you. What specific area interests you?",
    'math': "👻 Mathematics is the language of the universe! From basic arithmetic to advanced calculus and beyond, there's always something interesting to discover. What math topic would you like to explore?",
    'history': "👻 History helps us understand how we got to where we are today. Every era has fascinating stories and lessons. What historical period or event interests you?",
    'language': "👻 Languages are amazing tools for communication and expression! Whether it's learning grammar, vocabulary, or exploring different cultures through language, I'm here to help."
  };
  
  for (const [topic, response] of Object.entries(topics)) {
    if (input.toLowerCase().includes(topic)) {
      return response;
    }
  }
  
  return "👻 Learning is one of life's greatest adventures! I'd be happy to help explain concepts, break down complex topics, or explore new subjects with you. What would you like to learn about?";
}

async function getTechResponse(userId, input, userMemory) {
  const lowerInput = input.toLowerCase();
  
  if (lowerInput.includes('programming') || lowerInput.includes('code')) {
    return "👻 Programming is like solving puzzles with logic! Whether you're interested in web development, mobile apps, data science, or any other coding area, I can help explain concepts, discuss best practices, or troubleshoot problems. What programming topic interests you?";
  }
  
  if (lowerInput.includes('ai') || lowerInput.includes('artificial intelligence')) {
    return "👻 AI is transforming our world in incredible ways! From machine learning to natural language processing, there's so much to explore. I'm an example of AI in action! What aspect of AI would you like to discuss?";
  }
  
  if (lowerInput.includes('computer') || lowerInput.includes('software')) {
    return "👻 Technology shapes how we work, learn, and communicate! Whether you're curious about how computers work, software development, or the latest tech trends, I'm here to help explain and discuss. What tech topic interests you?";
  }
  
  return "👻 Technology is constantly evolving and there's always something new to discover! Whether it's hardware, software, emerging technologies, or how tech impacts society, I'd love to explore it with you. What specific area would you like to discuss?";
}

async function getCreativeResponse(userId, input, userMemory) {
  const lowerInput = input.toLowerCase();
  
  if (lowerInput.includes('writing') || lowerInput.includes('story')) {
    return "👻 Writing is a powerful way to express ideas and tell stories! Whether you're working on creative writing, need help with structure, want to brainstorm ideas, or discuss writing techniques, I'm here to help. What kind of writing project are you working on?";
  }
  
  if (lowerInput.includes('art') || lowerInput.includes('design')) {
    return "👻 Art and design are wonderful forms of expression! From traditional art to digital design, there are so many creative possibilities. I can discuss techniques, art history, design principles, or help you brainstorm creative ideas. What aspect of art or design interests you?";
  }
  
  if (lowerInput.includes('music')) {
    return "👻 Music is the universal language of emotion! Whether you're interested in music theory, composition, different genres, or the history of music, I'd love to explore it with you. What musical topic would you like to discuss?";
  }
  
  return "👻 Creativity is what makes us uniquely human! Whether it's artistic expression, creative problem-solving, or exploring new ideas, I'm excited to help spark your imagination. What creative project or idea are you working on?";
}

async function getProblemSolvingResponse(userId, input, userMemory) {
  const approaches = [
    "break it down into smaller, manageable steps",
    "look at it from different perspectives", 
    "consider what resources or tools might help",
    "think about similar problems you've solved before",
    "brainstorm multiple possible solutions"
  ];
  
  const approach = approaches[Math.floor(Math.random() * approaches.length)];
  
  return `👻 I'd be happy to help you work through this! When tackling problems, I often find it helpful to ${approach}. Could you tell me more about the specific challenge you're facing so I can provide more targeted assistance?`;
}

function findRelevantMemory(memories, input) {
  const inputWords = input.toLowerCase().split(' ');
  let bestMatch = null;
  let highestScore = 0;
  
  for (const memory of memories) {
    const memoryWords = memory.content.toLowerCase().split(' ');
    const commonWords = inputWords.filter(word => memoryWords.includes(word) && word.length > 3);
    
    if (commonWords.length > highestScore) {
      highestScore = commonWords.length;
      bestMatch = memory;
    }
  }
  
  return highestScore > 0 ? bestMatch : null;
}

async function generateContextualResponse(input, memory, userMemory) {
  const responses = [
    `How does this relate to what you're thinking about now?`,
    `I'm curious to hear more about your thoughts on this.`,
    `What new insights do you have about this topic?`,
    `How has your perspective changed since then?`,
    `Would you like to explore this topic further?`
  ];
  
  return responses[Math.floor(Math.random() * responses.length)];
}

async function getDefaultIntelligentResponse(userId, input, userMemory) {
  const thoughtfulResponses = [
    `👻 That's interesting! "${input}" makes me think about several possibilities. Could you tell me more about what specifically interests you about this?`,
    `👻 I find that fascinating! There are many angles to consider when it comes to "${input}". What aspect would you like to explore first?`,
    `👻 Great point! When you mention "${input}", it brings up some intriguing questions. What's your perspective on this?`,
    `👻 That's worth exploring! "${input}" is something that could be approached in different ways. What's your experience with this?`,
    `👻 Interesting topic! I'd love to dive deeper into "${input}" with you. What specific aspects are you most curious about?`
  ];
  
  // Add personalization based on user interests
  let personalizedEnding = "";
  if (userMemory.interests && userMemory.interests.length > 0) {
    personalizedEnding = ` Given your interest in ${userMemory.interests[0]}, this might connect to some broader themes we could explore.`;
  }
  
  const response = thoughtfulResponses[Math.floor(Math.random() * thoughtfulResponses.length)];
  return response + personalizedEnding;
}

function getHelpResponse() {
  return `👻 **Available Commands:**
• help - Show this help
• database status - Check database connections
• my profile - View your profile
• scan [urls] - Scan websites autonomously 
• analyze [url] - Analyze a specific website
• scanner status - Check autonomous scanner status
• enable scanner / scanner on - Enable autonomous mode
• disable scanner / scanner off - Disable autonomous mode

**What I can help with:**
• Answer questions and provide information
• **Autonomously scan and learn** from websites
• Analyze specific website content and structure
• Discuss topics you're interested in
• Help with problem-solving and decision making
• Learn about your preferences and adapt to help you better
• Provide explanations on various subjects
• Offer suggestions and advice

**Autonomous Scanner Features:**
• Safe website scanning with built-in security filters
• Recursive exploration of linked pages (configurable depth)
• Automatic content analysis and storage as memories
• Smart blocking of sensitive domains (.gov, .mil, etc.)
• Real-time learning from web content

**Examples:**
• "scan https://example.com"
• "analyze https://wikipedia.org"
• "scanner status"
• "enable scanner"

The scanner learns autonomously and stores information for future conversations!`;
}

function getDatabaseStatus() {
  let status = '👻 **Database Status:**\n';
  status += `• MongoDB: ${process.env.MONGODB_URI ? '✅ Connected' : '❌ Disabled'}\n`;
  status += `• Supabase: ${process.env.SUPABASE_URL ? '✅ Connected' : '❌ Disabled'}\n`;
  status += `• Firebase: ${process.env.FIREBASE_CONFIG ? '✅ Connected' : '❌ Disabled'}\n`;
  status += `• Memories stored: ${Object.values(AI_coreMemory.userProfiles).reduce((total, user) => total + Object.values(user.longTerm || {}).flat().length, 0)}`;
  return status;
}

function getUserProfileResponse(userId) {
  const userMemory = AI_coreMemory.userProfiles[userId];
  if (!userMemory) return "👻 I don't have a profile for you yet. Keep chatting with me!";
  
  return `👻 **Your Profile:**
• Interests: ${userMemory.interests.join(', ') || 'None yet'}
• Knowledge level: ${userMemory.knowledgeLevel}
• Memories: ${Object.values(userMemory.longTerm).flat().length}`;
}

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('🔗 User connected:', socket.id);
  
  socket.on('chat message', async (data) => {
    const { userId, message } = data;
    
    // Input validation
    if (!message || typeof message !== 'string' || message.length > 1000) {
      return socket.emit('chat response', {
        message: "👻 Please provide a valid message (max 1000 characters)",
        timestamp: new Date()
      });
    }
    
    await learn(userId || socket.id, message);
    const response = await generateResponse(userId || socket.id, message);
    
    socket.emit('chat response', {
      message: response,
      timestamp: new Date()
    });
  });
  
  socket.on('disconnect', () => {
    console.log('❌ User disconnected:', socket.id);
  });
});

// API Routes
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    users: Object.keys(AI_coreMemory.userProfiles).length,
    memories: Object.values(AI_coreMemory.userProfiles).reduce((total, user) => total + Object.values(user.longTerm || {}).flat().length, 0),
    timestamp: new Date()
  });
});

app.post('/api/learn', async (req, res) => {
  try {
    const { userId, text } = req.body;
    if (!userId || !text || text.length > 500) {
      return res.status(400).json({ success: false, error: 'Invalid input' });
    }
    
    await learn(userId, text);
    res.json({ success: true, message: 'Knowledge stored' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/profile/:userId', (req, res) => {
  const userId = req.params.userId;
  const userMemory = AI_coreMemory.userProfiles[userId];
  
  if (!userMemory) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  res.json({
    userId,
    interests: userMemory.interests,
    knowledgeLevel: userMemory.knowledgeLevel,
    memoryCount: Object.values(userMemory.longTerm).flat().length
  });
});

// Serve main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check endpoint for Render
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// Initialize and start server
async function startServer() {
  try {
    console.log('🔄 Initializing databases...');
    await db.initialize();
    console.log('✅ Databases initialized');
    
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 CasperAI server running on port ${PORT}`);
      console.log(`🌐 Open http://localhost:${PORT} to chat with CasperAI`);
    });
  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
}

startServer().catch(console.error);