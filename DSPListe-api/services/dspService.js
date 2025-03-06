const DSPCode = require('../models/dspModel');
let databaseMap = {};

/**
 * Chargement initial du databaseMap
 */
const loadInitialDatabaseMap = async () => {
  try {
    const dspList = await DSPCode.find({}, { dsp_code: 1, DataBase: 1, Access: 1 });
    databaseMap = {};
    dspList.forEach(item => {
      databaseMap[item.dsp_code] = {
        DataBase: item.DataBase,
        Access: item.Access
      };
    });
  } catch (error) {
    console.error('Erreur lors du chargement initial de databaseMap :', error.message);
  }
};


/**
 * Fonction pour actualiser le databaseMap après modification
 */
const refreshDatabaseMap = async () => {
  try {
    // Récupération optimisée : seulement dsp_code, DataBase et Access
    const dspList = await DSPCode.find({}).select('dsp_code DataBase Access -_id');
    
    // Réinitialisation du databaseMap
    databaseMap = {};

    // Mise à jour du databaseMap avec DataBase et Access
    dspList.forEach(item => {
      databaseMap[item.dsp_code] = {
        DataBase: item.DataBase,
        Access: item.Access
      };
    });

  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour du databaseMap :', error.message);
  }
};


const getDatabaseMap = () => {
  return databaseMap;
};

module.exports = {
  loadInitialDatabaseMap,
  refreshDatabaseMap,
  getDatabaseMap
};
