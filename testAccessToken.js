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
});

const Disponibilite = mongoose.models.Disponibilite || mongoose.model('Disponibilite', disponibiliteSchema);

// Générer les dates du 23 au 29 mars 2025
function generateDates() {
  const dates = [];
  const start = new Date('2025-03-23');
  const end = new Date('2025-03-30');

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dayStr = d.toDateString(); // Ex: "Sun Mar 23 2025"
    dates.push(dayStr);
  }

  return dates;
}

async function createDisponibilitesForAllEmployees() {
  try {
    const employees = await Employe.find();
    const shifts = await Shift.find();
    console.log("employees :"+employees)
    console.log("shifts "+shifts)

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
            expoPushToken: emp.expoPushToken || null,
          });

          await newDispo.save();
          console.log(`✅ Dispo ajoutée pour ${emp.name} le ${dateStr} - Shift: ${randomShift.name}`);
        } else {
          console.log(`⚠️ Déjà existante pour ${emp.name} le ${dateStr}`);
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
