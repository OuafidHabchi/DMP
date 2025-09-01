exports.createFuelCard = async (req, res) => {
  try {
    const FuelCard = req.connection.models.FuelCard;
    const newCard = new FuelCard(req.body);
    await newCard.save();
    res.status(200).json({ message: 'Fuel card created successfully', newCard });
  } catch (error) {
    res.status(500).json({ error: 'Error creating fuel card', details: error.message });
  }
};

exports.getAllFuelCards = async (req, res) => {
  try {
    const FuelCard = req.connection.models.FuelCard;
    const cards = await FuelCard.find();
    res.status(200).json(cards);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching fuel cards', details: error.message });
  }
};

exports.getFuelCardById = async (req, res) => {
  try {
    const FuelCard = req.connection.models.FuelCard;
    const card = await FuelCard.findById(req.params.id);
    res.status(200).json(card || {});
  } catch (error) {
    res.status(500).json({ error: 'Error fetching fuel card', details: error.message });
  }
};

exports.updateFuelCard = async (req, res) => {
  try {
    const FuelCard = req.connection.models.FuelCard;
    const updated = await FuelCard.findOneAndUpdate(
      { _id: req.params.id },
      req.body,
      { new: true }
    );
    res.status(200).json(updated || {});
  } catch (error) {
    res.status(500).json({ error: 'Error updating fuel card', details: error.message });
  }
};

exports.deleteFuelCard = async (req, res) => {
  try {
    const FuelCard = req.connection.models.FuelCard;
    const deleted = await FuelCard.findOneAndDelete({ _id: req.params.id });
    res.status(200).json({ message: deleted ? 'Fuel card deleted' : 'Nothing to delete' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting fuel card', details: error.message });
  }
};
