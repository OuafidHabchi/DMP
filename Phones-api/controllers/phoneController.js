exports.createPhone = async (req, res) => {
    try {
        const Phone = req.connection.models.Phone;
        const { linkedType, linkedId } = req.body;

        if (!linkedType || !linkedId) {
            return res.status(400).json({ message: "linkedType and linkedId are required" });
        }

        const phone = new Phone(req.body);
        await phone.save();
        res.status(200).json(phone);
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la création du téléphone', error });
    }
};


exports.getAllPhones = async (req, res) => {
    try {
        const Phone = req.connection.models.Phone; // Modèle dynamique
        const phones = await Phone.find();
        res.status(200).json(phones);
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la récupération des téléphones', error });
    }
};

exports.getPhoneById = async (req, res) => {
    try {
        const Phone = req.connection.models.Phone; // Modèle dynamique
        const phone = await Phone.findById(req.params.id);
        if (!phone) return res.status(500).json({ message: 'Téléphone introuvable' });
        res.status(200).json(phone);
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la récupération du téléphone', error });
    }
};

exports.updatePhone = async (req, res) => {
    try {
        const Phone = req.connection.models.Phone; // Modèle dynamique
        const phone = await Phone.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!phone) return res.status(500).json({ message: 'Téléphone introuvable' });
        res.status(200).json(phone);
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la mise à jour du téléphone', error });
    }
};

exports.deletePhone = async (req, res) => {
    try {
        const Phone = req.connection.models.Phone; // Modèle dynamique
        const phone = await Phone.findByIdAndDelete(req.params.id);
        if (!phone) return res.status(500).json({ message: 'Téléphone introuvable' });
        res.status(200).json({ message: 'Téléphone supprimé avec succès' });
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la suppression du téléphone', error });
    }
};

exports.getFunctionalPhones = async (req, res) => {
    try {
        const Phone = req.connection.models.Phone; // Modèle dynamique
        const functionalPhones = await Phone.find({ functional: true });
        res.status(200).json(functionalPhones);
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la récupération des téléphones fonctionnels', error });
    }
};
