// /controllers/statusController.js

// Create a new status
exports.createStatus = async (req, res) => {
    try {
      const Status = req.connection.models.Status; // Modèle dynamique
      const { name, location, color } = req.body;  // Plus de 'note'
      const newStatus = new Status({ name, location, color });
      await newStatus.save();
      res.status(200).json(newStatus);
    } catch (error) {
      res.status(500).json({ message: 'Failed to create status', error });
    }
  };

// Read all statuses
exports.getAllStatuses = async (req, res) => {
  try {
    const Status = req.connection.models.Status; // Modèle dynamique
    const statuses = await Status.find();
    res.status(200).json(statuses);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch statuses', error });
  }
};

// Read a single status by ID
exports.getStatusById = async (req, res) => {
  try {
    const Status = req.connection.models.Status; // Modèle dynamique
    const status = await Status.findById(req.params.id);
    if (!status) {
      return res.status(500).json({ message: 'Status not found' });
    }
    res.status(200).json(status);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch status', error });
  }
};

// Update a status by ID
exports.updateStatus = async (req, res) => {
    try {
      const Status = req.connection.models.Status; // Modèle dynamique
      const { name, location, color } = req.body;  // Plus de 'note'
      const updatedStatus = await Status.findByIdAndUpdate(
        req.params.id, 
        { name, location, color },  // Plus de 'note'
        { new: true }
      );
      if (!updatedStatus) {
        return res.status(500).json({ message: 'Status not found' });
      }
      res.status(200).json(updatedStatus);
    } catch (error) {
      res.status(500).json({ message: 'Failed to update status', error });
    }
  };
// Delete a status by ID
exports.deleteStatus = async (req, res) => {
  try {
    const Status = req.connection.models.Status; // Modèle dynamique
    const status = await Status.findByIdAndDelete(req.params.id);
    if (!status) {
      return res.status(500).json({ message: 'Status not found' });
    }
    res.status(200).json({ message: 'Status deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete status', error });
  }
};
