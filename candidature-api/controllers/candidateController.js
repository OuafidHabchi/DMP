// controllers/candidate.controller.js

exports.createCandidate = async (req, res) => {
  try {
    const Candidate = req.connection.models.Candidate;
    const { identity, createdBy } = req.body;

    const newCandidate = new Candidate({
      identity,
      createdBy,
      history: [{
        fromStepId: null,
        toStepId: null,
        at: new Date(),
        by: createdBy
      }]
    });

    await newCandidate.save();
    res.status(201).json(newCandidate);
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la création du candidat.", details: error.message });
  }
};

exports.getAllCandidates = async (req, res) => {
  try {
    const Candidate = req.connection.models.Candidate;
    const Employee = req.connection.models.Employee;

    const filter = {};

    if (req.query.stepId) {
      filter.currentStepId = req.query.stepId;
    }

    if (req.query.fullName) {
      filter["identity.fullName"] = { $regex: req.query.fullName, $options: "i" };
    }

    const candidates = await Candidate.find(filter).lean(); // lean() pour manipulation plus rapide

    // ➕ Enrichir l'historique avec les noms d'employés
    const allUserIds = [
      ...new Set(
        candidates.flatMap(c => c.history.map(h => h.by))
      )
    ];

    const users = await Employee.find({ _id: { $in: allUserIds } })
      .select("_id name familyName")
      .lean();

    const userMap = {};
    for (const user of users) {
      userMap[user._id.toString()] = {
        name: user.name,
        familyName: user.familyName
      };
    }

    // 🛠️ Remplacer l'ID par nom/prénom
    const enrichedCandidates = candidates.map(candidate => {
      const enrichedHistory = candidate.history.map(h => {
        const userInfo = userMap[h.by];
        return {
          ...h,
          byUser: userInfo || null
        };
      });
      return {
        ...candidate,
        history: enrichedHistory
      };
    });

    res.status(200).json(enrichedCandidates);
  } catch (error) {
    res.status(500).json({
      error: "Erreur lors de la récupération des candidats.",
      details: error.message
    });
  }
};



exports.getCandidateById = async (req, res) => {
  try {
    const Candidate = req.connection.models.Candidate;
    const candidate = await Candidate.findById(req.params.id);
    res.status(200).json(candidate || {});
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la récupération du candidat.", details: error.message });
  }
};

exports.moveCandidateToStep = async (req, res) => {
  try {
    const Candidate = req.connection.models.Candidate;
    const { toStepId, fieldValues, userId } = req.body;

    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) {
      return res.status(404).json({ error: "Candidat introuvable." });
    }

    // 🔐 Toujours s'assurer que stepData existe
    if (!candidate.stepData) candidate.stepData = {};

    // Ajout entrée d'historique
    const historyEntry = {
      fromStepId: candidate.currentStepId || null,
      toStepId,
      at: new Date(),
      by: userId
    };

    // Maj step courante
    candidate.currentStepId = toStepId;
    candidate.updatedAt = new Date();

    // Fusionner les champs de l’étape
    candidate.stepData[toStepId] = {
      ...(candidate.stepData[toStepId] || {}),
      ...fieldValues
    };

    // ✅ Indiquer à Mongoose que stepData (Mixed/Map) a changé
    candidate.markModified('stepData');

    // Historique en dernier
    candidate.history.push(historyEntry);

    await candidate.save();
    res.status(200).json(candidate);
  } catch (error) {
    res.status(500).json({ error: "Erreur lors du changement d'étape du candidat.", details: error.message });
  }
};


exports.deleteCandidate = async (req, res) => {  
  try {
    const Candidate = req.connection.models.Candidate;
    const deleted = await Candidate.findByIdAndDelete(req.params.id);


    res.status(200).json({
      message: deleted ? "Candidat supprimé avec succès." : "Aucun candidat trouvé à supprimer."
    });
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la suppression du candidat.", details: error.message });
  }
};

exports.updateCandidateFields = async (req, res) => {
  try {
    const Candidate = req.connection.models.Candidate;
    const { toStepId, fieldValues = {}, identity } = req.body;

    const update = {};

    if (identity && Object.keys(identity).length) {
      for (const [k, v] of Object.entries(identity)) {
        update[`identity.${k}`] = v;
      }
    }

    if (toStepId && Object.keys(fieldValues).length) {
      update[`stepData.${toStepId}`] = fieldValues;
      update[`updatedAt`] = new Date();
    }

    if (!Object.keys(update).length) {
      return res.status(400).json({ error: "Aucune donnée à mettre à jour." });
    }

    const candidate = await Candidate.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true, runValidators: false }
    );

    if (!candidate) {
      return res.status(404).json({ error: "Candidat introuvable." });
    }

    return res.status(200).json(candidate);
  } catch (error) {
    console.error("🔥 Erreur updateCandidateFields:", error.message);
    return res.status(500).json({
      error: "Erreur lors de la mise à jour du candidat.",
      details: error.message
    });
  }
};

exports.activateCandidate = async (req, res) => {
  try {
    const Candidate = req.connection.models.Candidate;

    // 🔹 Log des inputs
    console.log("▶️ [activateCandidate] Input params.id:", req.params.id);

    const candidate = await Candidate.findByIdAndUpdate(
      req.params.id,
      { $set: { activate: true, updatedAt: new Date() } },
      { new: true }
    );

    if (!candidate) {
      console.warn("⚠️ [activateCandidate] Aucun candidat trouvé pour id:", req.params.id);
      return res.status(404).json({ error: "Candidat introuvable." });
    }

    // 🔹 Log de la sortie
    console.log("✅ [activateCandidate] Candidat activé:", {
      id: candidate._id.toString(),
      fullName: candidate.identity?.fullName,
      personalEmail: candidate.identity?.personalEmail,
      activate: candidate.activate
    });

    res.status(200).json({
      message: "Candidat activé avec succès.",
      candidate
    });
  } catch (error) {
    console.error("❌ [activateCandidate] Erreur:", error.message);
    res.status(500).json({
      error: "Erreur lors de l'activation du candidat.",
      details: error.message
    });
  }
};


