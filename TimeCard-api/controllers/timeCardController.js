const path = require("path");
const { Types } = require('mongoose');
const { uploadMulterFiles, deleteByUrls } = require('../../utils/storage/uploader');

const { sendPushNotification } = require('../../utils/notifications'); // Importer la fonction de notification


// Créer une nouvelle fiche de temps
exports.createTimeCard = async (req, res) => {
  try {
    const TimeCard = req.connection.models.TimeCard; // Utilisation du modèle dynamique
    const {
      employeeId,
      day,
      startTime = null,
      endTime = null,
      tel = '',
      powerbank = '',
      lastDelivery = '',
      fuelCard = '',
      staging = '',        // ✅ NEW
      waveTime = '',
      refueled = false,        // ✅ NEW
    } = req.body;

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
      fuelCard,
      staging,            // ✅ NEW
      waveTime,
      refueled            // ✅ NEW
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
    const TimeCard = req.connection.models.TimeCard;
    const timeCard = await TimeCard.findByIdAndDelete(req.params.id);

    if (!timeCard) return res.status(404).json({ message: 'Fiche de temps non trouvée' });

    if (timeCard.image) {
      try { await deleteByUrls([timeCard.image]); } catch (_) {}
    }

    res.json({ message: 'Fiche de temps supprimée' });
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

    // Si la timeCard existe déjà, on met à jour les champs définis
    if (timeCard) {
      if (updateFields.startTime !== undefined) timeCard.startTime = updateFields.startTime;
      if (updateFields.endTime !== undefined) timeCard.endTime = updateFields.endTime;
      if (updateFields.tel !== undefined) timeCard.tel = updateFields.tel;
      if (updateFields.powerbank !== undefined) timeCard.powerbank = updateFields.powerbank;
      if (updateFields.lastDelivery !== undefined) timeCard.lastDelivery = updateFields.lastDelivery;
      if (updateFields.fuelCard !== undefined) timeCard.fuelCard = updateFields.fuelCard;
      if (updateFields.staging !== undefined) timeCard.staging = updateFields.staging;       // ✅ NEW
      if (updateFields.waveTime !== undefined) timeCard.waveTime = updateFields.waveTime;     // ✅ NEW
      if (updateFields.refueled !== undefined) timeCard.refueled = !!updateFields.refueled;


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
        staging: updateFields.staging || '',        // ✅ NEW
        waveTime: updateFields.waveTime || '',       // ✅ NEW
        refueled: updateFields.refueled === undefined ? false : !!updateFields.refueled,

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
    const { updates } = req.body;

    if (!Array.isArray(updates) || updates.length === 0) {
      return res
        .status(400)
        .json({ message: "Invalid input. 'updates' should be a non-empty array." });
    }

    const results = [];

    for (const update of updates) {
      const { id, CortexDuree, CortexEndTime, expoPushToken, staging, waveTime } = update;

      if (!id) {
        results.push({
          success: false,
          message: "TimeCard ID is required.",
          data: update,
        });
        continue;
      }

      let timeCard = await TimeCard.findById(id);
      let wasCreated = false;

      if (timeCard) {
        // Mise à jour simple (on met à jour seulement les champs fournis)
        if (CortexDuree !== undefined) timeCard.CortexDuree = CortexDuree;
        if (CortexEndTime !== undefined) timeCard.CortexEndTime = CortexEndTime;
        if (staging !== undefined) timeCard.staging = staging;
        if (waveTime !== undefined) timeCard.waveTime = waveTime;
        await timeCard.save();
      } else {
        // Création si la carte n'existe pas
        timeCard = new TimeCard({
          _id: id,
          CortexDuree: CortexDuree ?? null,
          CortexEndTime: CortexEndTime ?? null,
          staging: staging ?? "",
          waveTime: waveTime ?? "",
        });
        await timeCard.save();
        wasCreated = true;
      }

      // ✅ Notification dans tous les cas (si on a un token), avec message général
      const screenPath = "(driver)/(tabs)/(Employe)/AssignedVanScreen";
      const generalMessage = "Route details updated. Please open the app to review."; // message général

      const notification = { attempted: false, sent: false };
      if (expoPushToken) {
        notification.attempted = true;
        try {
          await sendPushNotification(expoPushToken, generalMessage, screenPath);
          notification.sent = true;
        } catch (err) {
          console.error("Push notification error:", err);
        }
      }

      results.push({
        success: true,
        message: wasCreated ? "Time card created successfully." : "Time card updated successfully.",
        data: timeCard,
        notification,
      });
    }

    res.status(200).json({ results });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error processing Cortex attributes.", error: error.message });
  }
};



exports.uploadTimeCardImage = async (req, res) => {
  try {
    const TimeCard = req.connection.models.TimeCard;
    const { id } = req.params;

    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ message: "No image file uploaded." });
    }

    // Upload vers Spaces sous timecards/{id}/...
    const uploaded = await uploadMulterFiles([req.file], {
      pathPrefix: `timecards/${id}`,
    });

    if (!uploaded.length) {
      return res.status(500).json({ message: "Upload failed." });
    }

    // Optionnel: supprimer l’ancienne image si existante
    const current = await TimeCard.findById(id).select('image');
    if (current?.image) {
      try { await deleteByUrls([current.image]); } catch (_) {}
    }

    const timeCard = await TimeCard.findByIdAndUpdate(
      id,
      { image: uploaded[0].url }, // URL publique Spaces
      { new: true }
    );

    if (!timeCard) return res.status(404).json({ message: "Time card not found." });

    res.status(200).json({ message: "Image uploaded successfully.", timeCard });
  } catch (error) {
    res.status(500).json({ message: "Error uploading image.", error: error.message || error });
  }
};





exports.getConsolidatedTimeCards = async (req, res) => {
  try {
    // ex param: "Thu Sep 18 2025" (peut arriver URL-encodé)
    const raw = req.params.date || '';
    const decoded = decodeURIComponent(raw);
    const dayStr = new Date(decoded).toDateString(); // normalisé

    const models =
      req.connection?.models ||
      req.app.get('mongoose')?.models;

    // 1) Assignations pour la date (tolère les deux formats: brut et normalisé)
    const vanAssignments =
      (await models.VanAssignment.find({
        date: { $in: [decoded, dayStr] },
      }).lean()) || [];

    const employeeIdStrs = vanAssignments
      .map((a) => String(a.employeeId))
      .filter(Boolean);

    const employeeObjIds = employeeIdStrs.map((id) => new Types.ObjectId(id));

    // Si aucune assignation, renvoyer un payload “vide” (cohérent avec le front)
    if (employeeObjIds.length === 0) {
      return res.status(200).json({
        employees: {},
        shifts: {},
        vans: {},
        disponibilities: {},
        timeCards: [],
        vanAssignments: [],
        functionalPhones: [],
        functionalPowerBanks: [],
        functionalFuelCards: [],
        usedFuelCardIds: [],
        usedPhoneIds: [],
        usedPowerBankIds: [],
      });
    }

    // 2) Disponibilités confirmées du jour pour ces employés
    const disponibilities =
      (await models.Disponibilite.find(
        {
          selectedDay: dayStr, // même normalisation que le front
          publish: true,
          employeeId: { $in: employeeIdStrs }, // stocké string dans cette collection
        },
        {
          _id: 1,
          employeeId: 1,
          shiftId: 1,
          confirmation: 1,
          selectedDay: 1,
          partnerType: 1,
          partnerEmployeeId: 1,
        }
      ).lean()) || [];

    // Inclure aussi les partenaires (helper/replacement)
    const partnerIdStrs = [
      ...new Set(
        disponibilities
          .map((d) => d.partnerEmployeeId && String(d.partnerEmployeeId))
          .filter(Boolean)
      ),
    ];

    // IDs finaux = employés assignés au van + partenaires
    const allEmployeeIdStrs = Array.from(
      new Set([...employeeIdStrs, ...partnerIdStrs])
    );
    const allEmployeeObjIds = allEmployeeIdStrs.map(
      (id) => new Types.ObjectId(id)
    );

    const shiftIds = [
      ...new Set(disponibilities.map((d) => String(d.shiftId)).filter(Boolean)),
    ];

    // 3) Récupérations parallèles
    const vanIds = [
      ...new Set(vanAssignments.map((a) => String(a.vanId)).filter(Boolean)),
    ];

    const [
      employees,
      shifts,
      vans,
      timeCards,
      // ✅ Phones & PowerBanks : inventaire complet fonctionnel (comme FuelCard)
      functionalPhones,
      functionalPowerBanks,
      functionalFuelCards,
    ] = await Promise.all([
      models.Employee.find({ _id: { $in: allEmployeeObjIds } }).lean() || [],
      models.Shift.find({ _id: { $in: shiftIds } }).lean() || [],
      models.Vehicle.find({ _id: { $in: vanIds } }).lean() || [],
      models.TimeCard.find({ day: { $in: [decoded, dayStr] } }).lean() || [],

      // ➜ IMPORTANT : plus de filtre sur van/employé du jour
      models.Phone.find({ functional: true }).lean(),
      models.PowerBank.find({ functional: true }).lean(),

      // FuelCards : inchangé (toutes les fonctionnelles)
      models.FuelCard.find({ functional: true }).lean() || [],
    ]);

    // 4) Ids d'équipements déjà utilisés ce jour (pour filtrage UI éventuel)
    const usedFuelCardIds = [
      ...new Set(
        (timeCards.map((tc) => tc.fuelCard).filter(Boolean) || []).map(String)
      ),
    ];

    const usedPhoneIds = [
      ...new Set(
        (timeCards.map((tc) => tc.tel).filter(Boolean) || []).map(String)
      ),
    ];

    const usedPowerBankIds = [
      ...new Set(
        (timeCards.map((tc) => tc.powerbank).filter(Boolean) || []).map(String)
      ),
    ];

    // 5) Réponse normalisée (objets indexés)
    res.status(200).json({
      employees: employees.reduce((acc, emp) => {
        acc[String(emp._id)] = emp;
        return acc;
      }, {}),
      shifts: shifts.reduce((acc, s) => {
        acc[String(s._id)] = s;
        return acc;
      }, {}),
      vans: vans.reduce((acc, v) => {
        acc[String(v._id)] = v;
        return acc;
      }, {}),
      // côté front: disponibilities[employeeId] => { shiftId, partnerType, partnerEmployeeId, ... }
      disponibilities: disponibilities.reduce((acc, d) => {
        acc[String(d.employeeId)] = d;
        return acc;
      }, {}),
      timeCards,
      vanAssignments,

      // ✅ Inventaires complets (fonctionnels)
      functionalPhones,
      functionalPowerBanks,
      functionalFuelCards,

      // ✅ Déjà utilisés aujourd'hui
      usedFuelCardIds,
      usedPhoneIds,
      usedPowerBankIds,
    });
  } catch (error) {
    console.error('Erreur dans getConsolidatedTimeCards:', error);
    res.status(500).json({
      error: 'Erreur lors de la consolidation des données',
      details: error?.message || String(error),
    });
  }
};

