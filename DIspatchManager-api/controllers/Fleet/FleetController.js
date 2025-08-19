const mongoose = require("mongoose");


exports.getVanAvailabilityStats = async (req, res) => {
    try {
        const Vehicle = req.connection.models.Vehicle;
        const ReportIssue = req.connection.models.ReportIssues;
        const Status = req.connection.models.Status;

        if (!Vehicle || !ReportIssue || !Status) {
            return res.status(500).json({ error: 'Modèles non disponibles' });
        }

        // 1. Tous les vans
        const allVans = await Vehicle.find();
        const totalVans = allVans.length;

        // 2. Tous les rapports
        const allReports = await ReportIssue.find();

        // 3. Tous les statuts
        const allStatuses = await Status.find();
        const statusMap = {};
        allStatuses.forEach(status => {
            statusMap[status._id.toString()] = status.name;
        });

        let drivableCount = 0;
        let nonDrivableCount = 0;
        const nonDrivableVans = [];

        allVans.forEach(van => {
            const vanReports = allReports.filter(report => report.vanId === van._id.toString());

            if (vanReports.length > 0) {
                const lastReport = vanReports[vanReports.length - 1];
                if (lastReport.drivable === false) {
                    nonDrivableCount++;
                    nonDrivableVans.push({
                        id: van._id,
                        vehicleNumber: van.vehicleNumber,
                        model: van.model,
                        status: statusMap[lastReport.statusId?.toString()] || 'Inconnu',
                        drivable: false,
                        note: lastReport.note || ''
                    });
                } else {
                    drivableCount++;
                }
            } else {
                // Aucun rapport = considéré comme drivable
                drivableCount++;
            }
        });

        const result = {
            totalVans,
            drivableCount,
            nonDrivableCount,
            nonDrivableVans
        };

        res.status(200).json(result);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: 'Erreur lors de la récupération des stats vans',
            details: error.message
        });
    }
};


exports.getVanAssignmentsByDate = async (req, res) => {
    try {
        const { date } = req.query; // Reçu au format YYYY-MM-DD
        if (!date) {
            return res.status(400).json({ error: 'The "date" parameter is required.' });
        }

        const Vehicle = req.connection.models.Vehicle;
        const VanAssignment = req.connection.models.VanAssignment;
        const Employee = req.connection.models.Employee;

        // ➤ Convertir la date en format : "Sat Jun 14 2025"
        const [year, month, day] = date.split("-").map(Number);
        const dateObj = new Date(year, month - 1, day); // mois commence à 0
        const formattedDate = dateObj.toDateString(); // donne par ex. "Sat Jun 14 2025"

        // 1. Récupérer toutes les assignations pour cette date
        const assignments = await VanAssignment.find({ date: formattedDate });

        if (assignments.length === 0) {
            return res.status(404).json({ error: 'No assignment found for this date.' });
        }

        // 2. Extraire tous les vanId et employeeId uniques
        const vanIds = [...new Set(assignments.map(a => a.vanId))];
        const employeeIds = [...new Set(assignments.map(a => a.employeeId))];

        // 3. Charger tous les vans et employés concernés
        const vans = await Vehicle.find({ _id: { $in: vanIds } });
        const employees = await Employee.find({ _id: { $in: employeeIds } });

        // 4. Créer un mapping rapide pour les noms
        const vanMap = {};
        vans.forEach(v => {
            vanMap[v._id.toString()] = v.vehicleNumber;
        });

        const employeeMap = {};
        employees.forEach(e => {
            employeeMap[e._id.toString()] = `${e.name} ${e.familyName}`;
        });

        // 5. Organiser les résultats
        const resultMap = {};
        assignments.forEach(a => {
            const vanName = vanMap[a.vanId];
            const employeeName = employeeMap[a.employeeId];

            if (vanName && employeeName) {
                if (!resultMap[vanName]) {
                    resultMap[vanName] = [];
                }
                resultMap[vanName].push(employeeName);
            }
        });

        // 6. Transformer en tableau formaté
        const response = Object.entries(resultMap).map(([vanName, employees]) => ({
            vanName,
            employees
        }));

        res.status(200).json(response);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: 'Erreur serveur',
            details: error.message
        });
    }
};





exports.getMissingEquipmentPhotosByDate = async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ error: 'The "date" parameter is required.' });
    }

    const TimeCard = req.connection.models.TimeCard;
    const EquipmentUpdate = req.connection.models.EquipmentUpdate;
    const Employee = req.connection.models.Employee;

    // 1. Obtenir tous les employés qui ont travaillé ce jour-là
    const timeCards = await TimeCard.find({ day: date });
    const employeeIds = [...new Set(timeCards.map(tc => tc.employeeId))];

    if (employeeIds.length === 0) {
      return res.status(200).json({ missingPrepic: [], missingPostpic: [] });
    }

    // 2. Charger les infos des employés
    const employees = await Employee.find({ _id: { $in: employeeIds } });
    const employeeMap = {};
    employees.forEach(emp => {
      employeeMap[emp._id.toString()] = `${emp.name} ${emp.familyName}`;
    });

    // 3. Obtenir tous les envois de photo ce jour-là pour les types "prepic" et "postpic"
    const updates = await EquipmentUpdate.find({
      day: date,
      userId: { $in: employeeIds },
      photoType: { $in: ["prepic", "postpic"] }
    });

    // 4. Identifier les IDs qui ont envoyé chaque type
    const sentPrepic = new Set();
    const sentPostpic = new Set();
    const lastVanMap = {}; // pour récupérer le vanName s’il existe

    updates.forEach(update => {
      if (update.photoType === "prepic") sentPrepic.add(update.userId);
      if (update.photoType === "postpic") sentPostpic.add(update.userId);

      // Sauvegarder le dernier van connu pour cet userId
      if (!lastVanMap[update.userId]) {
        lastVanMap[update.userId] = update.vanName;
      }
    });

    // 5. Comparer pour savoir qui a manqué, et inclure vanName si possible
    const missingPrepic = [];
    const missingPostpic = [];

    employeeIds.forEach(id => {
      const name = employeeMap[id];
      const van = lastVanMap[id] || "Unknown";

      if (!sentPrepic.has(id) && name) {
        missingPrepic.push({ name, van });
      }
      if (!sentPostpic.has(id) && name) {
        missingPostpic.push({ name, van });
      }
    });

    res.status(200).json({
      missingPrepic,
      missingPostpic
    });



  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: 'Server error while checking equipment photos.',
      details: error.message
    });
  }
};



exports.getPhoneStats = async (req, res) => {
  try {
    const Phone = req.connection.models.Phone;

    if (!Phone) {
      return res.status(500).json({ error: 'Le modèle Phone est introuvable.' });
    }

    // 1. Récupérer tous les téléphones
    const allPhones = await Phone.find();
    const totalPhones = allPhones.length;

    // 2. Filtrer les téléphones fonctionnels et non fonctionnels
    const functionalPhones = allPhones.filter(phone => phone.functional === true);
    const nonFunctionalPhones = allPhones
      .filter(phone => phone.functional === false)
      .map(phone => ({
        name: phone.name,
        number: phone.number,
        comment: phone.comment || "Aucun commentaire"
      }));

    // 3. Construire et envoyer la réponse
    res.status(200).json({
      totalPhones,
      functionalCount: functionalPhones.length,
      nonFunctionalCount: nonFunctionalPhones.length,
      nonFunctionalPhones
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Erreur serveur lors de la récupération des statistiques des téléphones.",
      details: error.message
    });
  }
};


exports.getPowerBankStats = async (req, res) => {
  try {
    const PowerBank = req.connection.models.PowerBank;

    if (!PowerBank) {
      return res.status(500).json({ error: 'Le modèle PowerBank est introuvable.' });
    }

    // 1. Récupérer toutes les powerbanks
    const allPowerBanks = await PowerBank.find();
    const totalPhones = allPowerBanks.length;

    // 2. Filtrer fonctionnels / non fonctionnels
    const functionalPhones = allPowerBanks.filter(pb => pb.functional === true);
    const nonFunctionalPhones = allPowerBanks
      .filter(pb => pb.functional === false)
      .map(pb => ({
        name: pb.name,
        comment: pb.comment || "Aucun commentaire"
      }));

    // 3. Réponse structurée
    res.status(200).json({
      totalPhones,
      functionalCount: functionalPhones.length,
      nonFunctionalCount: nonFunctionalPhones.length,
      nonFunctionalPhones
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Erreur serveur lors de la récupération des statistiques des PowerBanks.",
      details: error.message
    });
  }
};




exports.getEmployeeEquipmentsByDate = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ error: 'The "date" parameter is required.' });
    }

    const TimeCard = req.connection.models.TimeCard;
    const Employee = req.connection.models.Employee;
    const Phone = req.connection.models.Phone;
    const PowerBank = req.connection.models.PowerBank;

    // 1. Chercher les timecards pour cette date
    const timecards = await TimeCard.find({ day: date });

    if (timecards.length === 0) {
      return res.status(200).json({ message: "No timecards found for this date.", data: [] });
    }

    // 2. Extraire et filtrer les IDs valides
    const employeeIds = [...new Set(timecards.map(tc => tc.employeeId))].filter(id => !!id && mongoose.Types.ObjectId.isValid(id));
    const phoneIds = [...new Set(timecards.map(tc => tc.tel))].filter(id => !!id && mongoose.Types.ObjectId.isValid(id));
    const powerBankIds = [...new Set(timecards.map(tc => tc.powerbank))].filter(id => !!id && mongoose.Types.ObjectId.isValid(id));

    // 3. Charger les documents liés
    const employees = await Employee.find({ _id: { $in: employeeIds } });
    const phones = await Phone.find({ _id: { $in: phoneIds } });
    const powerBanks = await PowerBank.find({ _id: { $in: powerBankIds } });

    // 4. Création des maps pour lookup rapide
    const empMap = {};
    employees.forEach(e => empMap[e._id.toString()] = `${e.name} ${e.familyName}`);

    const phoneMap = {};
    phones.forEach(p => phoneMap[p._id.toString()] = p.name);

    const powerMap = {};
    powerBanks.forEach(pb => powerMap[pb._id.toString()] = pb.name);

    // 5. Construction du résultat final
    const result = timecards.map(tc => ({
      employee: empMap[tc.employeeId] || "Unknown",
      phone: phoneMap[tc.tel] || "Unknown",
      powerbank: powerMap[tc.powerbank] || "Unknown"
    }));

    // 6. Envoi de la réponse
    res.status(200).json({ count: result.length, data: result });

  } catch (error) {
    console.error("Error in getEmployeeEquipmentsByDate:", error);
    res.status(500).json({
      error: "Erreur serveur lors de la récupération des équipements des employés.",
      details: error.message
    });
  }
};
