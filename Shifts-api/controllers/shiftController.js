// Créer un shift
exports.createShift = async (req, res) => {
    try {
        const Shift = req.connection.models.Shift; // Charge dynamique du modèle
        const { name, starttime, endtime, color, visible } = req.body;

        const newShift = new Shift({ name, starttime, endtime, color, visible });
        await newShift.save();
        res.status(200).json(newShift);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Mettre à jour un shift
exports.updateShift = async (req, res) => {
    try {
        const Shift = req.connection.models.Shift; // Charge dynamique du modèle
        const { id } = req.params;
        const { name, starttime, endtime, color, visible } = req.body;

        const updatedShift = await Shift.findByIdAndUpdate(
            id,
            { name, starttime, endtime, color, visible },
            { new: true, runValidators: true }
        );
        if (!updatedShift) return res.status(500).json({ message: 'Shift not found' });
        res.json(updatedShift);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Supprimer un shift
exports.deleteShift = async (req, res) => {
    try {
        const Shift = req.connection.models.Shift; // Charge dynamique du modèle
        const { id } = req.params;

        const deletedShift = await Shift.findByIdAndDelete(id);
        if (!deletedShift) return res.status(500).json({ message: 'Shift not found' });
        res.json({ message: 'Shift deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Récupérer tous les shifts
exports.getAllShifts = async (req, res) => {
    
    try {
        const Shift = req.connection.models.Shift; // Charge dynamique du modèle
        const shifts = await Shift.find();
        res.json(shifts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Récupérer un shift par son nom
exports.getShiftByName = async (req, res) => {
    try {
        const Shift = req.connection.models.Shift; // Charge dynamique du modèle
        const { name } = req.params;

        const shift = await Shift.findOne({ name });
        if (!shift) return res.status(500).json({ message: 'Shift not found' });
        res.json(shift);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Récupérer un shift par son ID
exports.getShiftById = async (req, res) => {
    try {
        const Shift = req.connection.models.Shift; // Charge dynamique du modèle
        const { id } = req.params;

        const shift = await Shift.findById(id);
        if (!shift) return res.status(500).json({ message: 'Shift not found' });
        res.json(shift);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
