const mongoose = require('mongoose');
const vehicleSchema = require('./Fleet-api/models/vehicle'); // Remplace par le bon chemin

// Modèle Mongoose
const Vehicle = mongoose.model('Vehicle', vehicleSchema);

// Connexion à MongoDB
mongoose.connect('mongodb+srv://wafid:wafid@ouafid.aihn5iq.mongodb.net/VTRL', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('Connecté à MongoDB'))
  .catch((err) => console.error('Erreur de connexion MongoDB:', err));

// Génération de 40 véhicules
const vehicles = Array.from({ length: 40 }, (_, index) => ({
  vehicleNumber: `VAN-${index + 1}`,
  model: `Model-${index % 5 + 1}`,  // Modèles alternés de 1 à 5
  type: index % 2 === 0 ? 'Van' : 'Truck',  // Type alterné
  geotab: `GEOTAB-${index + 100}`,
  vin: `VIN-${index + 1000}`,
  license: `LICENSE-${index + 2000}`,
  Location: `Location-${index % 3 + 1}`,  // Location alternée de 1 à 3
  status: index % 2 === 0 ? 'Active' : 'Inactive',  // Statut alterné
}));

// Insertion dans MongoDB
const insertVehicles = async () => {
  try {
    await Vehicle.insertMany(vehicles);
    console.log('✅ 40 véhicules ont été insérés avec succès !');
    mongoose.connection.close();
  } catch (error) {
    console.error('❌ Erreur lors de l\'insertion des véhicules :', error);
  }
};

insertVehicles();
