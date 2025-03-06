const mongoose = require('mongoose');

const getDynamicModel = (dsp_code) => {
  const modelName = `Log_${dsp_code}`;

  // Toujours vérifier l'existence du modèle ici
  if (mongoose.models[modelName]) {
    return mongoose.models[modelName];
  } else {
    const LogSchema = new mongoose.Schema({}, { strict: false });
    return mongoose.model(modelName, LogSchema, `Logs_${dsp_code}`);
  }
};

module.exports = getDynamicModel;
