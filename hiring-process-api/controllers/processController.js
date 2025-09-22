// controllers/process.controller.js

exports.getProcess = async (req, res) => {
  try {
    const Process = req.connection.models.Process;
    const process = await Process.findOne();
    res.status(200).json(process || {});
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la récupération du processus.", details: error.message });
  }
};

exports.createProcess = async (req, res) => {
  try {
    const Process = req.connection.models.Process;
    const existing = await Process.findOne();
    if (existing) {
      return res.status(400).json({ error: "Le processus existe déjà." });
    }
    

    const { steps, ownerId } = req.body;
    const newProcess = new Process({ steps, ownerId });
    await newProcess.save();

    res.status(201).json(newProcess);
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la création du processus.", details: error.message });
  }
};

exports.updateProcess = async (req, res) => {
  
  try {
    const Process = req.connection.models.Process;
    const updated = await Process.findOneAndUpdate({}, { ...req.body, updatedAt: new Date() }, { new: true });
    res.status(200).json(updated || {});
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la mise à jour du processus.", details: error.message });
  }
};

exports.deleteProcess = async (req, res) => {
  try {
    const Process = req.connection.models.Process;

    // ✅ Supprimer tous les processus
    await Process.deleteMany();


    res.status(200).json({
      message: "Processus  supprimés.",
      
    });
  } catch (error) {
    res.status(500).json({
      error: "Erreur lors de la suppression du processus et des candidats.",
      details: error.message
    });
  }
};
