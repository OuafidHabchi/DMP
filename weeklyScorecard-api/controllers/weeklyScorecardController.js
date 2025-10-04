// Créer un nouveau weekly scorecard
exports.createWeeklyScorecard = async (req, res) => {
  try {
    const WeeklyScorecards = req.connection.models.WeeklyScorecards;
    const doc = new WeeklyScorecards(req.body);
    await doc.save();
    res.status(200).json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Lire tous les weekly scorecards
exports.getAllWeeklyScorecards = async (req, res) => {
  try {
    const WeeklyScorecards = req.connection.models.WeeklyScorecards;
    const docs = await WeeklyScorecards.find().sort({ weekStartDate: -1, createdAt: -1 });
    res.status(200).json(docs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Lire un weekly scorecard par ID
exports.getWeeklyScorecardById = async (req, res) => {
  try {
    const WeeklyScorecards = req.connection.models.WeeklyScorecards;
    const doc = await WeeklyScorecards.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Weekly scorecard not found' });
    res.status(200).json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Mettre à jour un weekly scorecard par ID
exports.updateWeeklyScorecard = async (req, res) => {
  try {
    const WeeklyScorecards = req.connection.models.WeeklyScorecards;
    const doc = await WeeklyScorecards.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!doc) return res.status(404).json({ error: 'Weekly scorecard not found' });
    res.status(200).json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Supprimer un weekly scorecard par ID
exports.deleteWeeklyScorecard = async (req, res) => {
  try {
    const WeeklyScorecards = req.connection.models.WeeklyScorecards;
    const doc = await WeeklyScorecards.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Weekly scorecard not found' });
    res.status(200).json({ message: 'Weekly scorecard deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Upsert par (employeeId, weekId) — utile à l’import hebdo
exports.upsertWeeklyScorecard = async (req, res) => {
  try {
    const WeeklyScorecards = req.connection.models.WeeklyScorecards;
    const { employeeId, weekId } = req.body || {};
    if (!employeeId || !weekId) {
      return res.status(400).json({ error: 'employeeId and weekId are required for upsert' });
    }

    const doc = await WeeklyScorecards.findOneAndUpdate(
      { employeeId, weekId },
      { $set: req.body },
      { upsert: true, new: true }
    );

    res.status(200).json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 📌 Renvoyer la liste des semaines disponibles
exports.getAvailableWeeks = async (req, res) => {
  try {
    const WeeklyScorecards = req.connection.models.WeeklyScorecards;

    const agg = await WeeklyScorecards.aggregate([
      {
        $group: {
          _id: '$weekId',
          count: { $sum: 1 },
          firstCreatedAt: { $min: '$createdAt' },
          lastUpdatedAt: { $max: '$updatedAt' },
          minWeekStartDate: { $min: '$weekStartDate' },
          maxWeekStartDate: { $max: '$weekStartDate' },
        },
      },
      {
        $project: {
          _id: 0,
          weekId: '$_id',
          count: 1,
          firstCreatedAt: 1,
          lastUpdatedAt: 1,
          minWeekStartDate: 1,
          maxWeekStartDate: 1,
        },
      },
      { $sort: { weekId: -1 } },
    ]);

    res.status(200).json(agg);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 📌 Renvoyer toutes les fiches d’une semaine donnée (sans sélection, brut)
exports.getWeeklyScorecardsByWeek = async (req, res) => {
  try {
    const WeeklyScorecards = req.connection.models.WeeklyScorecards;
    const { weekId } = req.params;

    if (!weekId) {
      return res.status(400).json({ error: 'weekId is required (format ex: 2025-W38)' });
    }

    // ⚡ On renvoie toutes les fiches de la semaine, sans tri ni résumé
    const items = await WeeklyScorecards.find({ weekId: String(weekId).trim() });

    return res.status(200).json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



// BULK UPSERT — body: { items: [ { employeeId, weekId, ... }, ... ] }
exports.bulkUpsertWeeklyScorecards = async (req, res) => {
  try {
    const WeeklyScorecards = req.connection.models.WeeklyScorecards;
    const { items } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items array is required' });
    }

    const results = [];
    let upserts = 0;

    for (const raw of items) {
      const { employeeId, weekId } = raw || {};
      if (!employeeId || !weekId) continue;

      const doc = await WeeklyScorecards.findOneAndUpdate(
        { employeeId, weekId: String(weekId).trim() },
        { $set: raw },
        { upsert: true, new: true }
      );

      results.push(doc);
      upserts += 1;
    }

    res.status(200).json({ upserts, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



// 🔹 Liste des weeks pour un employé + total + standing global
exports.getEmployeeWeeks = async (req, res) => {

  try {
    const WeeklyScorecards = req.connection.models.WeeklyScorecards;
    const { employeeId } = req.params;    
    if (!employeeId) {
      return res.status(400).json({ error: 'employeeId is required' });
    }

    // On récupère toutes les semaines de cet employé avec weekId + overallStanding
    const docs = await WeeklyScorecards.find(
      { employeeId },
      { weekId: 1, overallStanding: 1, _id: 0 }
    ).sort({ weekId: -1 });

    // Construire la liste simple { weekId, overallStanding }
    const weeks = docs.map(d => ({
      weekId: d.weekId,
      overallStanding: d.overallStanding || 'N/A'
    }));

    return res.status(200).json({
      count: weeks.length,
      weeks,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};



// 🔹 Détail d'une semaine pour un employé
exports.getEmployeeWeekDetails = async (req, res) => {
  try {
    const WeeklyScorecards = req.connection.models.WeeklyScorecards;
    const { employeeId, weekId } = req.params;

    if (!employeeId || !weekId) {
      return res.status(400).json({ error: 'employeeId and weekId are required' });
    }

    // Normalise l'ID semaine
    const normalizedWeekId = String(weekId).trim();

    const doc = await WeeklyScorecards
      .findOne({ employeeId, weekId: normalizedWeekId })
      .lean();

    if (!doc) {
      return res.status(404).json({ error: 'No scorecard found for this employee/week' });
    }

    // Optionnel: renvoyer juste ce qui t’intéresse au front
    // (sinon renvoie `doc` tel quel)
    const payload = {
      employeeId: doc.employeeId,
      weekId: doc.weekId,
      weekStartDate: doc.weekStartDate,
      overallStanding: doc.overallStanding,
      overallScore: doc.overallScore,
      packagesDelivered: doc.packagesDelivered,
      topIssues: doc.topIssues,   // [{ metric, tier, score }]
      isCritical: doc.isCritical,
      trendOverallScore: doc.trendOverallScore,
      importSource: doc.importSource,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };

    return res.status(200).json(payload);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};


// 📌 Récupérer les 6 dernières semaines d’un employé
exports.getLast6WeeksByEmployee = async (req, res) => {
  try {
    const WeeklyScorecards = req.connection.models.WeeklyScorecards;
    const { employeeId } = req.params;

    if (!employeeId) {
      return res.status(400).json({ error: 'employeeId is required' });
    }

    // 🔹 On trie par semaine descendante et on limite à 6
    const items = await WeeklyScorecards.find({ employeeId })
      .sort({ weekId: -1 })
      .limit(6)
      .select('weekId overallStanding overallScore packagesDelivered isCritical createdAt updatedAt');

    console.log(`[getLast6WeeksByEmployee] Found ${items.length} weeks for employee ${employeeId}`);

    return res.status(200).json({
      count: items.length,
      weeks: items,
    });
  } catch (err) {
    console.error('❌ Error in getLast6WeeksByEmployee:', err);
    return res.status(500).json({ error: err.message });
  }
};
