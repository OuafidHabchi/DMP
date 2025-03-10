const path = require("path");
const { sendPushNotification } = require('../../utils/notifications'); // Importer la fonction de notification


// Créer une nouvelle fiche de temps
exports.createTimeCard = async (req, res) => {
  try {
    const TimeCard = req.connection.models.TimeCard; // Utilisation du modèle dynamique
    const { employeeId, day, startTime = null, endTime = null, tel = '', powerbank = '', lastDelivery = '' } = req.body;

    // Ensure day is specified (could set today as default if it’s for current day)
    const today = day || new Date().toDateString();

    const existingTimeCard = await TimeCard.findOne({ employeeId, day: today });
    if (existingTimeCard) {
      return res.status(500).json({ message: 'Time card already exists for this day.' });
    }

    const newTimeCard = new TimeCard({
      employeeId,
      day: today,
      startTime,
      endTime,
      tel,
      powerbank,
      lastDelivery
    });

    await newTimeCard.save();
    res.status(200).json(newTimeCard);
  } catch (error) {
    res.status(500).json({ message: 'Error creating time card', error });
  }
};


// Lire toutes les fiches de temps
exports.getTimeCards = async (req, res) => {
  try {
    const TimeCard = req.connection.models.TimeCard; // Modèle dynamique
    const timeCards = await TimeCard.find();
    res.json(timeCards);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Lire une fiche de temps par ID  
exports.getTimeCardById = async (req, res) => {
  try {
    const TimeCard = req.connection.models.TimeCard; // Modèle dynamique
    const timeCard = await TimeCard.findById(req.params.id);
    if (timeCard) {
      res.json(timeCard);
    } else {
      res.status(500).json({ message: 'Fiche de temps non trouvée' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Mettre à jour une fiche de temps
exports.updateTimeCard = async (req, res) => {

  try {
    const TimeCard = req.connection.models.TimeCard; // Modèle dynamique
    const timeCard = await TimeCard.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (timeCard) {
      res.json(timeCard);
    } else {
      res.status(500).json({ message: 'Fiche de temps non trouvée' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Supprimer une fiche de temps
exports.deleteTimeCard = async (req, res) => {
  try {
    const TimeCard = req.connection.models.TimeCard; // Modèle dynamique
    const timeCard = await TimeCard.findByIdAndDelete(req.params.id);
    if (timeCard) {
      res.json({ message: 'Fiche de temps supprimée' });
    } else {
      res.status(500).json({ message: 'Fiche de temps non trouvée' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// Récupérer une fiche de temps par employeeId et day
exports.getTimeCardByEmployeeAndDay = async (req, res) => {
  try {
    const { employeeId, day } = req.params;
    const TimeCard = req.connection.models.TimeCard; // Modèle dynamique
    const timeCard = await TimeCard.findOne({ employeeId, day });

    if (timeCard) {
      // Check if startTime is empty (null, undefined, or an empty string)
      if (!timeCard.startTime) {  // This condition checks for "", null, or undefined
        return res.status(500).json({ message: "Time card found, but startTime is empty for this employee and day." });
      }
      // Return the time card if startTime is not empty
      res.json(timeCard);
    } else {
      res.status(500).json({ message: "Time card not found for this employee and day." });
    }
  } catch (error) {
    res.status(500).json({ message: "Error retrieving time card", error });
  }
};



exports.updateOrCreateTimeCard = async (req, res) => {
  try {
    const { employeeId, day } = req.params;
    const updateFields = req.body;
    const TimeCard = req.connection.models.TimeCard; // Modèle dynamique
    // Récupérer la timeCard existante pour vérifier si les champs n'ont pas changé
    let timeCard = await TimeCard.findOne({ employeeId, day });
    // Si la timeCard existe déjà, on met à jour les champs non définis
    if (timeCard) {
      // On garde les valeurs existantes et on met à jour celles qui sont définies
      if (updateFields.startTime !== undefined) timeCard.startTime = updateFields.startTime;
      if (updateFields.endTime !== undefined) timeCard.endTime = updateFields.endTime;
      if (updateFields.tel !== undefined) timeCard.tel = updateFields.tel;
      if (updateFields.powerbank !== undefined) timeCard.powerbank = updateFields.powerbank;
      if (updateFields.lastDelivery !== undefined) timeCard.lastDelivery = updateFields.lastDelivery;

      // Sauvegarder les modifications
      await timeCard.save();
    } else {
      // Si la timeCard n'existe pas, créer une nouvelle
      timeCard = new TimeCard({
        employeeId,
        day,
        startTime: updateFields.startTime || null,
        endTime: updateFields.endTime || null,
        tel: updateFields.tel || null,
        powerbank: updateFields.powerbank || null,
        lastDelivery: updateFields.lastDelivery || null,
      });

      await timeCard.save();
    }

    res.json(timeCard);
  } catch (error) {
    res.status(500).json({ message: "Error updating or creating time card", error });
  }
};

// Get all time cards for a specific day
exports.getTimeCardsByDay = async (req, res) => {
  try {
    const TimeCard = req.connection.models.TimeCard; // Modèle dynamique
    const { day } = req.params;

    // Recherche des timecards
    const timeCards = await TimeCard.find({ day });

    // Toujours retourner un statut 200 avec les résultats, même si la liste est vide
    res.status(200).json(timeCards);
  } catch (error) {
    res.status(500).json({ message: "Error retrieving time cards", error });
  }
};


// Mettre à jour ou créer les attributs CortexDuree et CortexEndTime pour plusieurs TimeCards
exports.bulkUpdateOrCreateCortexAttributes = async (req, res) => {
  try {
      const TimeCard = req.connection.models.TimeCard; // Modèle dynamique
      const { updates } = req.body; // `updates` est un tableau contenant les IDs et les nouvelles valeurs.

      if (!Array.isArray(updates) || updates.length === 0) {
          return res.status(500).json({ message: "Invalid input. 'updates' should be a non-empty array." });
      }

      const results = [];

      for (const update of updates) {
          const { id, CortexDuree, CortexEndTime, expoPushToken } = update;

          if (!id) {
              results.push({
                  success: false,
                  message: "TimeCard ID is required.",
                  data: update,
              });
              continue;
          }

          let timeCard = await TimeCard.findById(id);

          if (timeCard) {
              if (CortexDuree !== undefined) timeCard.CortexDuree = CortexDuree;
              if (CortexEndTime !== undefined) timeCard.CortexEndTime = CortexEndTime;

              await timeCard.save();
              results.push({
                  success: true,
                  message: "Time card updated successfully.",
                  data: timeCard,
              });
          } else {
              timeCard = new TimeCard({
                  _id: id,
                  CortexDuree: CortexDuree || null,
                  CortexEndTime: CortexEndTime || null,
              });

              await timeCard.save();
              results.push({
                  success: true,
                  message: "Time card created successfully.",
                  data: timeCard,
              });
          }

          // Envoyer une notification après la mise à jour ou la création
          if (expoPushToken) {
              const title = "Cortex Prediction";
              const body = `Your route details have been updated. Go to your app to see the changes`;
              const data = { timeCardId: timeCard._id };

              await sendPushNotification(expoPushToken, title, body, data);
          }
      }

      res.status(200).json({ results });
  } catch (error) {
      res.status(500).json({ message: "Error processing Cortex attributes.", error });
  }
};


exports.uploadTimeCardImage = async (req, res) => {
  try {
    const TimeCard = req.connection.models.TimeCard; // Dynamic model
    const { id } = req.params; // Get time card ID from URL

    // Ensure the file is uploaded
    if (!req.file) {
      return res.status(500).json({ message: "No file uploaded." });
    }

    // Construct the file path
    const imagePath = `/${req.file.filename}`;

    // Find the time card and update the image field
    const timeCard = await TimeCard.findByIdAndUpdate(
      id,
      { image: imagePath },
      { new: true } // Return the updated document
    );

    if (!timeCard) {
      return res.status(500).json({ message: "Time card not found." });
    }

    res.status(200).json({
      message: "Image uploaded successfully.",
      timeCard,
    });
  } catch (error) {
    res.status(500).json({ message: "Error uploading image.", error });
  }
};

