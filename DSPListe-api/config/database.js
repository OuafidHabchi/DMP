// 📁 config/database.js
const mongoose = require('mongoose');

// URI de connexion à MongoDB
const uri = 'mongodb+srv://wafid:wafid@ouafid.aihn5iq.mongodb.net/DSP';

const connectToDSP = async () => {
  try {
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
  } catch (error) {
    console.error('❌ Erreur de connexion à MongoDB:', error.message);
  }
};

module.exports = connectToDSP;
