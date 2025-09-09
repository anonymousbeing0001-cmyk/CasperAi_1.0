const { initMongoDB, storeInMongo, retrieveFromMongo } = require('./mongodb');
const { initSupabase, storeInSupabase } = require('./supabase');
const { initFirebase, storeInFirebase } = require('./firebase');

class DatabaseManager {
  constructor() {
    this.primaryDB = null;
    this.dbType = null;
  }

  async initialize() {
    // Determine primary database based on availability
    if (process.env.MONGODB_URI) {
      const success = await initMongoDB();
      if (success) {
        this.primaryDB = {
          store: storeInMongo,
          retrieve: retrieveFromMongo
        };
        this.dbType = 'mongodb';
        console.log('✅ Using MongoDB as primary database');
        return;
      }
    }
    
    if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
      const success = initSupabase();
      if (success) {
        this.primaryDB = {
          store: storeInSupabase,
          retrieve: async () => [] // Supabase retrieval would need implementation
        };
        this.dbType = 'supabase';
        console.log('✅ Using Supabase as primary database');
        return;
      }
    }
    
    if (process.env.FIREBASE_CONFIG) {
      const success = initFirebase();
      if (success) {
        this.primaryDB = {
          store: storeInFirebase,
          retrieve: async () => [] // Firebase retrieval would need implementation
        };
        this.dbType = 'firebase';
        console.log('✅ Using Firebase as primary database');
        return;
      }
    }
    
    // Fallback to memory storage
    console.log('⚠️ No database configured - using memory only');
    this.primaryDB = this.createMemoryDB();
    this.dbType = 'memory';
  }

  createMemoryDB() {
    const memory = new Map();
    return {
      store: async (data) => {
        const id = Date.now().toString();
        memory.set(id, { ...data, id });
        return true;
      },
      retrieve: async (userId, options = {}) => {
        return Array.from(memory.values())
          .filter(item => item.userId === userId)
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
          .slice(0, options.limit || 10);
      }
    };
  }

  async store(data) {
    if (!this.primaryDB) {
      throw new Error('Database not initialized');
    }
    
    try {
      return await this.primaryDB.store(data);
    } catch (error) {
      console.error('Database storage failed:', error);
      return false;
    }
  }

  async retrieve(userId, options = {}) {
    if (!this.primaryDB) {
      throw new Error('Database not initialized');
    }
    
    try {
      return await this.primaryDB.retrieve(userId, options);
    } catch (error) {
      console.error('Database retrieval failed:', error);
      return [];
    }
  }

  getDatabaseType() {
    return this.dbType;
  }
}

module.exports = new DatabaseManager();
