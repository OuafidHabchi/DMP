// Obtenir toutes les assignations
exports.getAllAssignments = async (req, res) => {
    try {
        const ClothesAssignment = req.connection.models.ClothesAssignment;
        const assignments = await ClothesAssignment.find() || [];
        res.status(200).json(assignments);
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la récupération des assignations.', details: error.message });
    }
};

// Obtenir une assignation par ID
exports.getAssignmentById = async (req, res) => {
    try {
        const ClothesAssignment = req.connection.models.ClothesAssignment;
        const assignment = await ClothesAssignment.findById(req.params.id);
        res.status(200).json(assignment || {}); // Retourne un objet vide au lieu d'une erreur
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la récupération de l\'assignation.', details: error.message });
    }
};

// Ajouter une nouvelle assignation
exports.createAssignment = async (req, res) => {
    try {
        const ClothesAssignment = req.connection.models.ClothesAssignment;
        const { clothesId, employeeId, quantite, createdBy } = req.body;
        const newAssignment = new ClothesAssignment({ clothesId, employeeId, quantite, createdBy });
        await newAssignment.save();
        res.status(200).json(newAssignment);
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la création de l\'assignation.', details: error.message });
    }
};

// Supprimer une assignation
exports.deleteAssignment = async (req, res) => {
    try {
        const ClothesAssignment = req.connection.models.ClothesAssignment;
        const deletedAssignment = await ClothesAssignment.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: deletedAssignment ? 'Assignation supprimée avec succès.' : 'Aucune assignation à supprimer.' });
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la suppression de l\'assignation.', details: error.message });
    }
};
