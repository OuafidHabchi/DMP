// controllers/reportIssuesController.js

// Créer un nouveau rapport
exports.createReportIssue = async (req, res) => {
  try {
    const ReportIssue = req.connection.models.ReportIssues; // Modèle dynamique
    const newReport = new ReportIssue(req.body);
    await newReport.save();
    res.status(200).json(newReport);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Lire tous les rapports
exports.getAllReportIssues = async (req, res) => {
  try {
    const ReportIssue = req.connection.models.ReportIssues; // Modèle dynamique
    const reports = await ReportIssue.find();
    res.status(200).json(reports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Lire un rapport par ID
exports.getReportIssueById = async (req, res) => {
  try {
    const ReportIssue = req.connection.models.ReportIssues; // Modèle dynamique
    const report = await ReportIssue.findById(req.params.id);
    if (!report) return res.status(500).json({ error: 'Report not found' });
    res.status(200).json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Mettre à jour un rapport par ID
exports.updateReportIssue = async (req, res) => {
  try {
    const ReportIssue = req.connection.models.ReportIssues; // Modèle dynamique
    const report = await ReportIssue.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!report) return res.status(500).json({ error: 'Report not found' });
    res.status(200).json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Supprimer un rapport par ID
exports.deleteReportIssue = async (req, res) => {
  try {
    const ReportIssue = req.connection.models.ReportIssues; // Modèle dynamique
    const report = await ReportIssue.findByIdAndDelete(req.params.id);
    if (!report) return res.status(500).json({ error: 'Report not found' });
    res.status(200).json({ message: 'Report deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteReportIssuesByVanId = async (req, res) => {
  try {
    const ReportIssue = req.connection.models.ReportIssues; // Modèle dynamique
    const vanId = req.params.vanId;
    // Supprimer les rapports associés au vanId
    const result = await ReportIssue.deleteMany({ vanId });
    // Réponse avec le nombre de rapports supprimés
    res.status(200).json({ message: `${result.deletedCount} report(s) deleted successfully` });
  } catch (err) {
    // Gestion des erreurs
    res.status(500).json({ error: err.message });
  }
};
