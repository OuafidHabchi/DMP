const mongoose = require('mongoose');

// Connexion MongoDB
mongoose.connect('mongodb+srv://wafid:wafid@ouafid.aihn5iq.mongodb.net/VTRL')
  .then(() => console.log('✅ Connexion à MongoDB réussie'))
  .catch((err) => console.error('❌ Erreur de connexion MongoDB:', err));

// Schémas
const employeSchema = require('./Employes-api/models/Employee');
const shiftSchema = require('./Shifts-api/models/shift');

const Employe = mongoose.models.Employe || mongoose.model('Employee', employeSchema);
const Shift = mongoose.models.Shift || mongoose.model('Shift', shiftSchema);

const disponibiliteSchema = new mongoose.Schema({
  employeeId: { type: String, required: true },
  selectedDay: { type: String, required: true },
  shiftId: { type: String, required: true },
  decisions: { type: String, default: 'pending' },
  expoPushToken: { type: String },
  // confirmation: { type: String }, // Confirmation (optionnel)
  // presence: { type: String }, // Présence (optionnel)
  // seen: {type:Boolean}
});

const Disponibilite = mongoose.models.Disponibilite || mongoose.model('Disponibilite', disponibiliteSchema);

// Générer les dates du 23 au 29 mars 2025
function generateDates() {
  const dates = [];
  const start = new Date('2025-04-6');
  const end = new Date('2025-04-13');

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dayStr = d.toDateString(); // Ex: "Sun Mar 23 2025"
    dates.push(dayStr);
  }

  return dates;
}

async function createDisponibilitesForAllEmployees() {
  try {
    const employees = await Employe.find();
    const shifts = await Shift.find({ visible: true });
    console.log("employees :" + employees)
    console.log("shifts " + shifts)

    if (shifts.length === 0) {
      console.error('❌ Aucun shift trouvé.');
      return;
    }

    const dates = generateDates();

    for (const dateStr of dates) {
      for (const emp of employees) {
        const randomShift = shifts[Math.floor(Math.random() * shifts.length)];

        const exists = await Disponibilite.findOne({
          employeeId: emp._id.toString(),
          selectedDay: dateStr,
        });

        if (!exists) {
          const newDispo = new Disponibilite({
            employeeId: emp._id.toString(),
            selectedDay: dateStr,
            shiftId: randomShift._id.toString(),
            decisions: 'pending',
            // confirmation: 'confirmed',
            // seen: true,
            // presence: 'confirmed',
            expoPushToken: emp.expoPushToken || null,
          });

          await newDispo.save();
          console.log(`✅ Dispo ajoutée pour ${emp.name} le ${dateStr} - Shift: ${randomShift.name}`);
        } else {
          // Supprimer l'ancienne dispo
          await Disponibilite.deleteOne({
            employeeId: emp._id.toString(),
            selectedDay: dateStr,
          });

          // En créer une nouvelle avec un nouveau shift
          const newDispo = new Disponibilite({
            employeeId: emp._id.toString(),
            selectedDay: dateStr,
            shiftId: randomShift._id.toString(),
            decisions: 'pending',
            expoPushToken: emp.expoPushToken || null,
          });

          await newDispo.save();
          console.log(`♻️ Dispo remplacée pour ${emp.name} le ${dateStr} - Nouveau shift: ${randomShift.name}`);
        }
      }
    }

    console.log('🎉 Création des disponibilités terminée.');
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    mongoose.connection.close();
  }
}

createDisponibilitesForAllEmployees();
