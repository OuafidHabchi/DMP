exports.createPowerBank = async (req, res) => {
    
    try {
        const PowerBank = req.connection.models.PowerBank;


        // ✅ récupération avec les champs ajoutés
        const { name, functional, comment, linkedType, linkedId } = req.body;

        const powerBank = new PowerBank({
            name,
            functional,
            comment,
            linkedType,
            linkedId,
        });

        await powerBank.save();
        res.status(200).json(powerBank);
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la création du PowerBank', error });
    }
};


exports.getAllPowerBanks = async (req, res) => {
    try {
        const PowerBank = req.connection.models.PowerBank; // Modèle dynamique
        const powerBanks = await PowerBank.find();
        res.status(200).json(powerBanks);
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la récupération des PowerBanks', error });
    }
};

exports.getPowerBankById = async (req, res) => {
    try {
        const PowerBank = req.connection.models.PowerBank; // Modèle dynamique
        const powerBank = await PowerBank.findById(req.params.id);
        if (!powerBank) return res.status(500).json({ message: 'PowerBank introuvable' });
        res.status(200).json(powerBank);
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la récupération du PowerBank', error });
    }
};

exports.updatePowerBank = async (req, res) => {
    try {
        const PowerBank = req.connection.models.PowerBank; // Modèle dynamique
        const powerBank = await PowerBank.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!powerBank) return res.status(500).json({ message: 'PowerBank introuvable' });
        res.status(200).json(powerBank);
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la mise à jour du PowerBank', error });
    }
};

exports.deletePowerBank = async (req, res) => {
    try {
        const PowerBank = req.connection.models.PowerBank; // Modèle dynamique
        const powerBank = await PowerBank.findByIdAndDelete(req.params.id);
        if (!powerBank) return res.status(500).json({ message: 'PowerBank introuvable' });
        res.status(200).json({ message: 'PowerBank supprimé avec succès' });
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la suppression du PowerBank', error });
    }
};

exports.getFunctionalPowerBanks = async (req, res) => {
    try {
        const PowerBank = req.connection.models.PowerBank; // Modèle dynamique
        const functionalPowerBanks = await PowerBank.find({ functional: true });
        res.status(200).json(functionalPowerBanks);
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la récupération des PowerBanks fonctionnels', error });
    }
};
