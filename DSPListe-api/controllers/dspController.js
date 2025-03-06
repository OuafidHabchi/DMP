const mongoose = require('mongoose');
const DSPCode = require('../models/dspModel');
const dspService = require('../services/dspService');
const { getAdminDatabaseConnection } = require('../config/adminDatabase');
const getDynamicModel = require('../models/dynamicModel');
const contactSchema = require('../../Contacts-api/models/contactModel');




// Récupérer le databaseMap et le convertir en tableau
exports.getAllDSP = async (req, res) => {
  try {
    // Récupération directe depuis MongoDB pour inclure Access
    const dspList = await DSPCode.find({}, { _id: 0, dsp_code: 1, DataBase: 1, Access: 1 });
    res.status(200).json(dspList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// Ajouter un nouveau mapping
exports.createDSP = async (req, res) => {
  try {
    const { dsp_code, DataBase, Access } = req.body;
    const newDSP = new DSPCode({
      dsp_code,
      DataBase,
      Access,
    });
    await newDSP.save();
    await dspService.refreshDatabaseMap();
    res.status(200).json({ message: 'Mapping ajouté avec succès.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// Mettre à jour un mapping
exports.updateDSP = async (req, res) => {
  try {
    const { dsp_code } = req.params;
    const { DataBase, Access } = req.body; // Ajout de Access

    // Création de l'objet de mise à jour
    const updateFields = {};
    if (DataBase) updateFields.DataBase = DataBase;
    if (typeof Access === 'boolean') updateFields.Access = Access;

    // Mise à jour du mapping dans MongoDB
    await DSPCode.findOneAndUpdate({ dsp_code }, updateFields);

    // Rafraîchir immédiatement le databaseMap
    await dspService.refreshDatabaseMap();

    // Log pour vérifier que le cache est bien mis à jour
    const updatedMap = dspService.getDatabaseMap();

    res.status(200).json({ message: 'Mapping mis à jour avec succès.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// Supprimer un mapping
exports.deleteDSP = async (req, res) => {
  try {
    const { dsp_code } = req.params;
    await DSPCode.findOneAndDelete({ dsp_code });
    await dspService.refreshDatabaseMap();
    res.status(200).json({ message: 'Mapping supprimé avec succès.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Récupérer les détails d'une base via le dsp_code
exports.getDSPById = async (req, res) => {
  try {
    const { dsp_code } = req.params;

    // Vérification du mapping dans la collection DSP_code
    const dsp = await DSPCode.findOne({ dsp_code }).select('dsp_code DataBase Access -_id');
    if (!dsp) {
      return res.status(500).json({ message: 'Mapping non trouvé.' });
    }

    // Connexion dynamique à la base de données
    const connection = await getAdminDatabaseConnection(dsp_code);
    if (!connection) {
      return res.status(500).json({ message: 'Impossible de se connecter à la base de données.' });
    }

    // Chargement dynamique du modèle Employee
    let Employee = connection.models.Employee;
    if (!Employee) {
      // Utilisation du schéma importé pour créer le modèle
      const employeSchema = require('../../Employes-api/models/Employee');
      Employee = connection.model('Employee', employeSchema);
    }

    // Récupération des détails
    const totalEmployees = await Employee.countDocuments();
    const managers = await Employee.find({ role: 'manager' }).select('name email familyName tel -_id');

    // Réponse JSON avec les détails, incluant Access
    res.status(200).json({
      totalEmployees,
      managers,
      Access: dsp.Access // Ajout de Access à la réponse JSON
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des détails:', error.message);
    res.status(500).json({ error: error.message });
  }
};



exports.getDSPLogs = async (req, res) => {
  try {
    const { dsp_code } = req.params;
    const { period } = req.query;

    // Vérification du dsp_code
    if (!dsp_code) {
      return res.status(500).json({ message: 'Le code DSP est requis.' });
    }
    // Utilisation du composant dynamique pour obtenir le modèle
    const LogModel = getDynamicModel(dsp_code);

    // Filtrage par période
    const dateFilter = {};
    const today = new Date();
    if (period === 'today') {
      today.setHours(0, 0, 0, 0);
      dateFilter.timestamp = { $gte: today };
    } else if (period === 'week') {
      const firstDayOfWeek = new Date();
      firstDayOfWeek.setDate(today.getDate() - today.getDay());
      firstDayOfWeek.setHours(0, 0, 0, 0);
      dateFilter.timestamp = { $gte: firstDayOfWeek };
    } else if (period === 'month') {
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      dateFilter.timestamp = { $gte: firstDayOfMonth };
    }

    // Agrégation des logs avec les requêtes réussies, échouées et les détails des erreurs
    const logs = await LogModel.aggregate([
      { $match: dateFilter },
      {
        $facet: {
          totalRequests: [{ $count: "count" }],
          avgResponseTime: [
            { $group: { _id: null, avgTime: { $avg: "$responseTime" } } }
          ],
          topRoutes: [
            { $group: { _id: "$url", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 3 }
          ],
          httpMethods: [
            { $group: { _id: "$method", count: { $sum: 1 } } }
          ],
          peakTrafficTime: [
            { $group: { _id: { $hour: "$timestamp" }, count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 1 }
          ],
          // Requêtes réussies : 200 ou 200
          successfulRequests: [
            {
              $match: {
                $or: [
                  { status: { $in: [200, 200,304] } },
                  { statusCode: { $in: [200, 200,304] } }
                ]
              }
            },
            { $count: "count" }
          ],
          // Requêtes échouées : 500, 500, ou 500
          failedRequests: [
            {
              $match: {
                $or: [
                  { status: { $in: [500, 500, 500] } },
                  { statusCode: { $in: [500, 500, 500] } }
                ]
              }
            },
            { $count: "count" }
          ],
          // Détails des requêtes échouées (URL et statut)
          failedRequestsDetails: [
            {
              $match: {
                $or: [
                  { status: { $in: [500, 500, 500] } },
                  { statusCode: { $in: [500, 500, 500] } }
                ]
              }
            },
            { $project: { url: 1, status: 1, statusCode: 1, timestamp: 1 } },
            { $sort: { timestamp: -1 } }
          ]
        }
      }
    ]);


    res.status(200).json({
      totalRequests: logs[0].totalRequests[0]?.count || 0,
      avgResponseTime: logs[0].avgResponseTime[0]?.avgTime || 0,
      topRoutes: logs[0].topRoutes,
      httpMethods: logs[0].httpMethods,
      peakTrafficTime: logs[0].peakTrafficTime[0] || null,
      successfulRequests: logs[0].successfulRequests[0]?.count || 0,
      failedRequests: logs[0].failedRequests[0]?.count || 0,
      failedRequestsDetails: logs[0].failedRequestsDetails
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des logs:', error.message);
    res.status(500).json({ error: error.message });
  }
};


// Récupérer tous les messages depuis toutes les bases de données et les regrouper par dsp_code et DataBase
exports.getAllContacts = async (req, res) => {
  try {
    // 1. Récupérer tous les dsp_code actifs avec leurs DataBase
    const dspList = await DSPCode.find({ Access: true }, { _id: 0, dsp_code: 1, DataBase: 1 });
    
    // 2. Tableau pour stocker les messages groupés par dsp_code et DataBase
    const groupedMessages = [];

    // 3. Boucle sur chaque dsp_code
    for (const dsp of dspList) {
      const { dsp_code, DataBase } = dsp;

      try {
        // Connexion dynamique à la base de données
        const connection = await getAdminDatabaseConnection(dsp_code);
        if (!connection) {
          console.error(`❌ Impossible de se connecter à la base de données pour dsp_code=${dsp_code}`);
          continue; // Passe au dsp_code suivant
        }

        // Chargement dynamique du modèle Contact
        let Contact = connection.models.Contact;
        if (!Contact) {
          Contact = connection.model('Contact', contactSchema);
        }

        // Récupération des messages pour ce dsp_code
        const messages = await Contact.find().lean();

        // Regrouper les messages par dsp_code et DataBase
        groupedMessages.push({
          dsp_code,
          DataBase,
          messages
        });

      } catch (err) {
        console.error(`❌ Erreur lors de la récupération des messages pour dsp_code=${dsp_code}:`, err.message);
        // Continue même en cas d'erreur pour un dsp_code
      }
    }

    // 4. Retourner les messages regroupés par dsp_code et DataBase
    res.status(200).json(groupedMessages);

  } catch (error) {
    console.error('❌ Erreur lors de la récupération des contacts:', error.message);
    res.status(500).json({ message: 'Erreur lors de la récupération des contacts', error });
  }
};


// Marquer un message comme lu (read: true)
exports.markAsRead = async (req, res) => {
  try {
    const { dsp_code, id } = req.params;

    // Connexion dynamique à la base de données
    const connection = await getAdminDatabaseConnection(dsp_code);
    if (!connection) {
      return res.status(500).json({ message: 'Impossible de se connecter à la base de données.' });
    }

    // Chargement dynamique du modèle Contact
    let Contact = connection.models.Contact;
    if (!Contact) {
      Contact = connection.model('Contact', contactSchema);
    }

    // Mise à jour du champ "read" à true
    const updatedMessage = await Contact.findByIdAndUpdate(
      id,
      { read: true },
      { new: true }
    );

    // Si le message n'est pas trouvé
    if (!updatedMessage) {
      return res.status(500).json({ message: 'Message non trouvé.' });
    }

    res.status(200).json({ message: 'Message marqué comme lu.', updatedMessage });
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour du statut de lecture :', error.message);
    res.status(500).json({ message: 'Erreur lors de la mise à jour.', error });
  }
};


// Marquer un message comme fixé (fixer: true)
exports.markAsFixed = async (req, res) => {
  try {
    const { dsp_code, id } = req.params;

    // Connexion dynamique à la base de données
    const connection = await getAdminDatabaseConnection(dsp_code);
    if (!connection) {
      return res.status(500).json({ message: 'Impossible de se connecter à la base de données.' });
    }

    // Chargement dynamique du modèle Contact
    let Contact = connection.models.Contact;
    if (!Contact) {
      Contact = connection.model('Contact', contactSchema);
    }

    // Mise à jour du champ "fixer" à true
    const updatedMessage = await Contact.findByIdAndUpdate(
      id,
      { fixer: true },
      { new: true }
    );

    // Si le message n'est pas trouvé
    if (!updatedMessage) {
      return res.status(500).json({ message: 'Message non trouvé.' });
    }

    res.status(200).json({ message: 'Message marqué comme fixé.', updatedMessage });
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour du statut de fixation :', error.message);
    res.status(500).json({ message: 'Erreur lors de la mise à jour.', error });
  }
};
