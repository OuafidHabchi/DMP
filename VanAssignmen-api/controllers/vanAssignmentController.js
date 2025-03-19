// controllers/vanAssignmentController.js

/// Créer une ou plusieurs affectations de véhicules
exports.createVanAssignment = async (req, res) => {
    try {
        const VanAssignment = req.connection.models.VanAssignment; // Modèle dynamique
        const data = req.body;
        // Vérifie si data est un tableau
        if (Array.isArray(data)) {
            // Insère plusieurs documents
            const newAssignments = await VanAssignment.insertMany(data);
            res.status(200).json(newAssignments);
        } else {
            // Si ce n'est pas un tableau, insère un seul document
            const newAssignment = new VanAssignment(data);
            await newAssignment.save();
            res.status(200).json(newAssignment);
        }
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la création des affectations de véhicules' });
    }
};

// Récupérer toutes les affectations de véhicules
exports.getAllVanAssignments = async (req, res) => {
    try {
        const VanAssignment = req.connection.models.VanAssignment; // Modèle dynamique
        const assignments = await VanAssignment.find();
        res.json(assignments);
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la récupération des affectations de véhicules' });
    }
};

// Récupérer une affectation de véhicule par ID
exports.getVanAssignmentById = async (req, res) => {
    try {
        const VanAssignment = req.connection.models.VanAssignment; // Modèle dynamique
        const assignment = await VanAssignment.findById(req.params.id);
        if (!assignment) return res.status(500).json({ error: 'Affectation de véhicule non trouvée' });
        res.json(assignment);
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la récupération de l\'affectation de véhicule' });
    }
};

// Mettre à jour une affectation de véhicule
exports.updateVanAssignment = async (req, res) => {
    try {
        const VanAssignment = req.connection.models.VanAssignment; // Modèle dynamique
        const assignment = await VanAssignment.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!assignment) return res.status(500).json({ error: 'Affectation de véhicule non trouvée' });
        res.json(assignment);
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la mise à jour de l\'affectation de véhicule' });
    }
};

// Supprimer une affectation de véhicule
exports.deleteVanAssignment = async (req, res) => {
    try {
        const { employeeId, date } = req.params; // Récupérer les paramètres employeeId et date
        const VanAssignment = req.connection.models.VanAssignment; // Modèle dynamique
        // Rechercher et supprimer l'affectation correspondant à l'employé et à la date
        const assignment = await VanAssignment.findOneAndDelete({ 
            employeeId, 
            date 
        });

        // Vérifier si l'assignation existe
        if (!assignment) {
            return res.status(500).json({ error: 'Affectation de véhicule non trouvée' });
        }

        // Réponse de succès
        res.json({ message: 'Affectation de véhicule supprimée avec succès' });
    } catch (error) {
        console.error('Erreur lors de la suppression de l\'affectation :', error);
        res.status(500).json({ error: 'Erreur lors de la suppression de l\'affectation de véhicule' });
    }
};


exports.getAssignmentsByDate = async (req, res) => {
    try {
        const VanAssignment = req.connection.models.VanAssignment; // Modèle dynamique
        const { date } = req.params;          
        // Trouver toutes les assignations pour la date donnée
        const assignments = await VanAssignment.find({ date });
        res.status(200).json(assignments);
    } catch (error) {
        console.error('Erreur lors de la récupération des assignations pour la date', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des assignations' });
    }
};

exports.updateAssignmentsByDateAndEmployee = async (req, res) => {
    try {
        const VanAssignment = req.connection.models.VanAssignment; // Modèle dynamique
        const { date, employeeId } = req.params;
        const updateData = req.body; // Contains the fields to update
        // console.log("update"+date, employeeId);
        // Find and update the assignment for the specified date and employee ID
        const updatedAssignment = await VanAssignment.updateOne(
            { date, employeeId },
            { $set: updateData },
            { new: true, returnDocument: "after" }
        );
        if (updatedAssignment.modifiedCount > 0) {
            res.status(200).json(updatedAssignment);
        } else {
            res.status(500).json({ message: "No assignments found for the specified date and employee" });
        }
    } catch (error) {
        console.error('Error updating assignment for the specified date and employee', error);
        res.status(500).json({ error: 'Error updating assignment' });
    }
};

