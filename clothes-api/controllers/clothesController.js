// controllers/clothesController.js

// Obtenir tous les vêtements
exports.getAllClothes = async (req, res) => {
    try {
        const Clothes = req.connection.models.Clothes;
        const clothes = await Clothes.find() || [];
        res.status(200).json(clothes);
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la récupération des vêtements.', details: error.message });
    }
};

// Obtenir un vêtement par ID
exports.getClothesById = async (req, res) => {
    try {
        const Clothes = req.connection.models.Clothes;
        const clothes = await Clothes.findById(req.params.id);
        res.status(200).json(clothes || {}); // Retourne un objet vide au lieu d'une erreur
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la récupération du vêtement.', details: error.message });
    }
};

// Ajouter un nouveau vêtement
exports.createClothes = async (req, res) => {
    try {
        const Clothes = req.connection.models.Clothes;
        const newClothes = new Clothes(req.body);
        await newClothes.save();
        res.status(200).json(newClothes);
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la création du vêtement.', details: error.message });
    }
};

// Mettre à jour un vêtement
exports.updateClothes = async (req, res) => {
    try {
        const Clothes = req.connection.models.Clothes;
        const updatedClothes = await Clothes.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.status(200).json(updatedClothes || {}); // Retourne un objet vide si non trouvé
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la mise à jour du vêtement.', details: error.message });
    }
};

// Supprimer un vêtement
exports.deleteClothes = async (req, res) => {
    try {
        const Clothes = req.connection.models.Clothes;
        const deletedClothes = await Clothes.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: deletedClothes ? 'Vêtement supprimé avec succès.' : 'Aucun vêtement à supprimer.' });
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la suppression du vêtement.', details: error.message });
    }
};
