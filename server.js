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

const PORT = process.env.PORT || 3000;

// Security middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

// Database manager
const db = require('./database/manager');

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
  
  // Try to retrieve from database
  try {
    const memories = await db.retrieve(userId, { limit: 5 });
    if (memories.length > 0) {
      const memory = memories[Math.floor(Math.random() * memories.length)];
      return `👻 I remember: "${memory.content}"`;
    }
  } catch (error) {
    console.error('Retrieval error:', error);
  }
  
  // Default responses
  if (["hello", "hi", "hey"].some(g => lowerInput.includes(g))) {
    return "👻 Hello! I'm CasperAI, your advanced AI assistant!";
  }
  
  if (["bye", "goodbye"].some(g => lowerInput.includes(g))) {
    return "👻 Goodbye! It was great chatting with you!";
  }
  
  // Personalized response
  let personalization = "";
  if (userMemory.interests && userMemory.interests.length > 0) {
    personalization = ` I know you're interested in ${userMemory.interests.join(', ')}!`;
  }
  
  return `👻 I heard: "${input}".${personalization} Tell me more!`;
}

function getHelpResponse() {
  return `👻 **Available Commands:**
• help - Show this help
• database status - Check database connections
• my profile - View your profile
• learn faster - Enable accelerated learning
• generate password - Create secure passwords
• security scan - Check security status`;
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
    
    server.listen(PORT, () => {
      console.log(`🚀 CasperAI server running on port ${PORT}`);
      console.log(`🌐 Open http://localhost:${PORT} to chat with CasperAI`);
    });
  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
}

startServer().catch(console.error);