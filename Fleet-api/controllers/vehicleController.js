// Ajouter un véhicule
exports.addVehicle = async (req, res) => {
    try {
        const { vehicleNumber, model, type, geotab, vin, license, Location, status } = req.body;

        const Vehicle = req.connection.models.Vehicle; // Modèle injecté dynamiquement
        const newVehicle = new Vehicle({ vehicleNumber, model, type, geotab, vin, license, Location, status });
        await newVehicle.save();

        res.status(200).json({ message: 'Véhicule ajouté avec succès', vehicle: newVehicle });
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de l\'ajout du véhicule', error });
    }
};

// Récupérer tous les véhicules
exports.getAllVehicles = async (req, res) => {
    try {
        const Vehicle = req.connection.models.Vehicle;

        if (!Vehicle) {
            return res.status(500).json({ error: 'Le modèle Vehicle n\'est pas disponible dans la connexion actuelle.' });
        }

        const vehicles = await Vehicle.find() || [];

        res.status(200).json({ data: vehicles });
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la récupération des véhicules.', details: error.message });
    }
};

// Récupérer un véhicule par ID
exports.getVehicleById = async (req, res) => {
    try {
        const Vehicle = req.connection.models.Vehicle;

        if (!Vehicle) {
            return res.status(500).json({ error: 'Le modèle Vehicle n\'est pas disponible dans la connexion actuelle.' });
        }

        const vehicle = await Vehicle.findById(req.params.id);
        
        res.status(200).json({ data: vehicle || {} }); // Retourne un objet vide si non trouvé
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la récupération du véhicule.', details: error.message });
    }
};


// Mettre à jour un véhicule par ID
exports.updateVehicleById = async (req, res) => {
    try {
        const { vehicleNumber, model, type, geotab, vin, license, Location, status } = req.body;

        const Vehicle = req.connection.models.Vehicle;
        const updatedVehicle = await Vehicle.findByIdAndUpdate(
            req.params.id,
            { vehicleNumber, model, type, geotab, vin, license, Location, status },
            { new: true, runValidators: true }
        );

        if (!updatedVehicle) {
            return res.status(500).json({ message: 'Véhicule non trouvé' });
        }
        res.status(200).json({ message: 'Véhicule mis à jour avec succès', vehicle: updatedVehicle });
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la mise à jour du véhicule', error });
    }
};

// Supprimer un véhicule par ID
exports.deleteVehicleById = async (req, res) => {
    try {
        const Vehicle = req.connection.models.Vehicle;
        const deletedVehicle = await Vehicle.findByIdAndDelete(req.params.id);

        if (!deletedVehicle) {
            return res.status(500).json({ message: 'Véhicule non trouvé' });
        }
        res.status(200).json({ message: 'Véhicule supprimé avec succès' });
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la suppression du véhicule', error });
    }
};
