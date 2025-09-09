const admin = require('firebase-admin');

let db;
let isInitialized = false;

function initFirebase() {
  try {
    // Check for Firebase config in environment variables
    if (process.env.FIREBASE_CONFIG) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      
      db = admin.firestore();
      isInitialized = true;
      return true;
    }
    
    // Check for Firebase service account JSON
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      
      db = admin.firestore();
      isInitialized = true;
      return true;
    }
    
    console.log('❌ Firebase config not provided');
    return false;
  } catch (error) {
    console.error('Firebase initialization error:', error);
    return false;
  }
}

async function storeInFirebase(data) {
  if (!isInitialized) return false;
  
  try {
    await db.collection('memories').add({
      ...data,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error('Firebase storage error:', error);
    return false;
  }
}

module.exports = {
  initFirebase,
  storeInFirebase
};
