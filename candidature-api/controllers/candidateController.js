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

    const historyEntry = {
      fromStepId: candidate.currentStepId || null,
      toStepId,
      at: new Date(),
      by: userId
    };

    candidate.currentStepId = toStepId;
    candidate.updatedAt = new Date();
    candidate.history.push(historyEntry);
    candidate.stepData[toStepId] = {
      ...(candidate.stepData[toStepId] || {}),
      ...fieldValues
    };

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
    const { toStepId, fieldValues, identity } = req.body;

    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) {
      return res.status(404).json({ error: "Candidat introuvable." });
    }

    // ✅ Mise à jour de identity
    if (identity) {
      candidate.identity = {
        ...candidate.identity,
        ...identity
      };
    }

    // ✅ Mise à jour de stepData
    if (toStepId && fieldValues) {
      if (!candidate.stepData) candidate.stepData = {};
      candidate.stepData[toStepId] = {
        ...(candidate.stepData[toStepId] || {}),
        ...fieldValues
      };

      // 🔥 Marque le champ modifié pour forcer Mongoose à le sauvegarder
      candidate.markModified('stepData');
    }

    await candidate.save();
    res.status(200).json(candidate);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Erreur lors de la mise à jour du candidat.",
      details: error.message
    });
  }
};


