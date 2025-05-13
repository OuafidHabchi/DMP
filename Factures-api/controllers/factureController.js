const fs = require('fs');
const path = require('path');
const { sendPushNotification } = require('../../utils/notifications');

// Répertoire pour stocker les images
const uploadDirectory = path.join(__dirname, '../uploadsFacture');

// Vérifiez si le répertoire existe, sinon créez-le
if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true });
}


exports.createFacture = async (req, res) => {
  try {
    // Vérification des données requises
    if (!req.body.name) {
      console.error('Nom de la facture manquant');
      return res.status(500).json({ error: 'Le nom de la facture est requis' });
    }

    const Factures = req.connection.models.Factures;
    const Employee = req.connection.models.Employee;

    if (!Factures) {
      console.error('Modèle Factures non disponible');
      return res.status(500).json({ error: 'Erreur de configuration serveur' });
    }

    const { name, createdBy, createdAt,note } = req.body;

    // Construction du chemin du fichier
    const filePath = req.file
      ? path.join('uploadsFacture', req.file.filename)
      : null;


    // Création de la facture
    const facture = await Factures.create({
      name,
      createdBy,
      createdAt: createdAt || new Date(),
      filePath,
      note
    });



    // if (Employee) {
    //   const managers = await Employee.find({ role: 'manager' }).select('expoPushToken');
    //   // Récupération des informations du créateur de la facture (nom, prénom)
    //   const creator = await Employee.findById(facture.createdBy).select('name familyName');

    //   // ✅ Envoi des notifications aux managers ayant un expoPushToken
    //   for (const manager of managers) {
    //     if (manager.expoPushToken) {
    //       const notificationBody = `${creator.name} ${creator.familyName} has issued a new invoice. Please check it now!`;
    //       const screen = '(manager)/(tabs)/(RH)/Factures'; // ✅ Chemin du screen pour accéder à la section Factures

    //       await sendPushNotification(manager.expoPushToken, notificationBody, screen);
    //     }
    //   }
    // }

    res.status(200).json({
      success: true,
      data: facture
    });

  } catch (error) {
    console.error('Erreur complète:', {
      message: error.message,
      stack: error.stack,
      body: req.body,
      file: req.file
    });

    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création de la facture',
    });
  }
};


// Récupérer toutes les factures avec les détails des créateurs
exports.getFactures = async (req, res) => {
  try {
    const Factures = req.connection.models.Factures;
    const Employee = req.connection.models.Employee;

    if (!Factures || !Employee) {
      console.error('Modèles non disponibles : Factures ou Employee');
    }
    // Récupérer toutes les factures
    const factures = await Factures.find({});

    // Ajouter les infos du créateur à chaque facture
    const facturesWithCreators = await Promise.all(
      factures.map(async (facture) => {
        const employe = await Employee.findById(facture.createdBy);
        return {
          ...facture.toJSON(),
          creator: employe
            ? {
              name: employe.name,
              familyName: employe.familyName,
            }
            : null,
        };
      })
    );
    res.status(200).json(facturesWithCreators.reverse());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// Récupérer une facture par ID avec les détails du créateur
exports.getFactureById = async (req, res) => {
  try {
    const Factures = req.connection.models.Factures;
    const Employee = req.connection.models.Employee;

    if (!Factures || !Employee) {
      console.error('Modèles non disponibles : Factures ou Employee');
    }

    // Trouver la facture par ID
    const facture = await Factures.findById(req.params.id);
    if (!facture) {
      return res.status(404).json({ message: 'Facture non trouvée' });
    }

    // Trouver l'employé qui a créé la facture
    const employe = await Employee.findById(facture.createdBy);

    // Construire la réponse avec les infos du créateur
    const factureWithCreator = {
      ...facture.toJSON(),
      creator: employe
        ? {
          name: employe.name,
          familyName: employe.familyName,
        }
        : null, // si l'employé n'existe pas
    };

    console.log('Facture trouvée :', factureWithCreator);

    res.status(200).json(factureWithCreator);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// Mettre à jour une facture
exports.updateFacture = async (req, res) => {
  try {
    const Factures = req.connection.models.Factures;
    const { name } = req.body;
    const fileUrl = req.file ? `/uploads/${req.file.filename}` : undefined;

    const facture = await Factures.findByPk(req.params.id);
    if (!facture) {
      return res.status(404).json({ message: 'Facture non trouvée' });
    }

    if (name) facture.name = name;
    if (fileUrl) facture.fileUrl = fileUrl;
    await facture.save();

    res.status(200).json(facture);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Supprimer une facture
exports.deleteFacture = async (req, res) => {
  try {
    const Factures = req.connection.models.Factures;
    const facture = await Factures.findByIdAndDelete(req.params.id);
    if (!facture) {
      return res.status(500).json({ message: 'Facture non trouvée' });
    }
    // Pas besoin de `await facture.destroy();` ici car findByIdAndDelete l'a déjà supprimée
    res.status(200).json({ message: 'Facture supprimée avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de la facture :', error);
    res.status(500).json({ error: error.message });
  }
};
