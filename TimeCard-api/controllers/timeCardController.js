const path = require("path");
const { sendPushNotification } = require('../../utils/notifications'); // Importer la fonction de notification


// Créer une nouvelle fiche de temps
exports.createTimeCard = async (req, res) => {
  try {
    const TimeCard = req.connection.models.TimeCard; // Utilisation du modèle dynamique
    const { employeeId, day, startTime = null, endTime = null, tel = '', powerbank = '', lastDelivery = '', fuelCard = '' } = req.body;

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
      lastDelivery,
      fuelCard
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
      if (updateFields.fuelCard !== undefined) timeCard.fuelCard = updateFields.fuelCard;

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
        fuelCard: updateFields.fuelCard || null,
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
      let shouldSendNotification = false;

      if (timeCard) {
        // Vérifier s'il y a des différences avant de mettre à jour
        const hasDureeChanged = CortexDuree !== undefined && timeCard.CortexDuree !== CortexDuree;
        const hasEndTimeChanged = CortexEndTime !== undefined && timeCard.CortexEndTime !== CortexEndTime;

        if (hasDureeChanged) timeCard.CortexDuree = CortexDuree;
        if (hasEndTimeChanged) timeCard.CortexEndTime = CortexEndTime;

        // Déterminer si une notification doit être envoyée
        shouldSendNotification = (hasDureeChanged || hasEndTimeChanged) &&
          expoPushToken &&
          CortexDuree &&
          CortexEndTime;

        await timeCard.save();
        results.push({
          success: true,
          message: "Time card updated successfully.",
          data: timeCard,
        });
      } else {
        // Pour une nouvelle carte, on peut choisir d'envoyer ou non une notification
        shouldSendNotification = expoPushToken && CortexDuree && CortexEndTime;

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

      if (shouldSendNotification) {
        const screenPath = '(driver)/(tabs)/(Employe)/AssignedVanScreen';

        // Vérifier si CortexDuree est bien formaté et extraire les heures correctement
        const dureeParts = CortexDuree.split(':');
        if (dureeParts.length < 2) {
          console.error("Format incorrect de CortexDuree:", CortexDuree);
        }

        const [hours, minutes] = dureeParts.map(Number);
        const addMinutesToTime = (time, minutesToAdd) => {
          const [hours, minutes] = time.split(':').map(Number);
          const date = new Date();
          date.setHours(hours, minutes + minutesToAdd, 0);

          const newHours = String(date.getHours()).padStart(2, '0');
          const newMinutes = String(date.getMinutes()).padStart(2, '0');

          return `${newHours}:${newMinutes}`;
        };

        let adjustedEndTime = CortexEndTime;
        if (hours > 5) {
          adjustedEndTime = addMinutesToTime(CortexEndTime, 30);
        }
        const message = `Route updated! Ends at ${adjustedEndTime}, duration: ${CortexDuree} min. Check the app!`;
        try {
          await sendPushNotification(expoPushToken, message, screenPath);
        } catch (error) {
          console.error("Erreur lors de l'envoi de la notification:", error);
        }
      }
    }
    res.status(200).json({ results });
  } catch (error) {
    res.status(500).json({ message: "Error processing Cortex attributes.", error: error.message });
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


exports.getConsolidatedTimeCards = async (req, res) => {
  try {
    const { date } = req.params;
    const models = req.connection.models;

    // 1) Assignations pour la date
    const vanAssignments = await (models.VanAssignment.find({ date }) || []);
    const employeeIds = vanAssignments.map(a => a.employeeId);

    // 2) Disponibilités confirmées
    const disponibilities = await (models.Disponibilite.find({
      selectedDay: new Date(date).toDateString(),
      publish: true,
      employeeId: { $in: employeeIds }
    }) || []);

    const shiftIds = [...new Set(disponibilities.map(d => d.shiftId))];

    // 3) Parallèle: employés, shifts, vans, timecards, devices, fuel cards
    const [
      employees,
      shifts,
      vans,
      timeCards,
      [functionalPhones, functionalPowerBanks],
      functionalFuelCards
    ] = await Promise.all([
      models.Employee.find({ _id: { $in: employeeIds } }) || [],
      models.Shift.find({ _id: { $in: shiftIds } }) || [],
      models.Vehicle.find({ _id: { $in: [...new Set(vanAssignments.map(a => a.vanId))] } }) || [],
      models.TimeCard.find({ day: date }) || [],
      Promise.all([
        models.Phone.find({ functional: true }),
        models.PowerBank.find({ functional: true })
      ]),
      models.FuelCard.find({ functional: true }) || []     // ⬅️ NOUVEAU
    ]);

    // (optionnel) ids déjà utilisés ce jour-là
    const usedFuelCardIds = [
      ...new Set(
        (timeCards.map(tc => tc.fuelCard).filter(Boolean))
      )
    ];

    // 4) Structurer la réponse
    const response = {
      employees: employees.reduce((acc, emp) => ({ ...acc, [emp._id]: emp }), {}),
      shifts: shifts.reduce((acc, shift) => ({ ...acc, [shift._id]: shift }), {}),
      vans: vans.reduce((acc, van) => ({ ...acc, [van._id]: van }), {}),
      disponibilities: disponibilities.reduce((acc, disp) => ({ ...acc, [disp.employeeId]: disp }), {}),
      timeCards,
      vanAssignments,
      functionalPhones,
      functionalPowerBanks,
      functionalFuelCards,    // ⬅️ NOUVEAU
      usedFuelCardIds         // ⬅️ OPTIONNEL (si tu veux t’en servir côté front)
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('Erreur dans getConsolidatedTimeCards:', error);
    res.status(500).json({
      error: 'Erreur lors de la consolidation des données',
      details: error.message
    });
  }
};


