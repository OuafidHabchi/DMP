const { sendPushNotification } = require('../../utils/notifications');

// Créer une nouvelle violation
exports.createViolation = async (req, res) => {
  try {
      const DailyViolation = req.connection.models.DailyViolation;
      const violation = new DailyViolation(req.body);
      await violation.save();

      res.status(200).json(violation);

      if (req.body.expoPushToken) {
          const notificationTitle = "New Violation Recorded";
          const notificationBody = `A violation of type ${req.body.type || "Unknown"} has been recorded. Check the details in your app.`;

          sendPushNotification(req.body.expoPushToken, notificationTitle, notificationBody).catch((error) => {
              console.error("Error sending push notification:", error);
          });
      }
  } catch (err) {
      res.status(500).json({ error: "Erreur lors de la création de la violation.", details: err.message });
  }
};


// Obtenir toutes les violations
exports.getViolations = async (req, res) => {
  try {
      const DailyViolation = req.connection.models.DailyViolation;
      const violations = await DailyViolation.find() || [];
      res.status(200).json(violations);
  } catch (err) {
      res.status(500).json({ error: "Erreur lors de la récupération des violations.", details: err.message });
  }
};



// Obtenir une violation par ID
exports.getViolationById = async (req, res) => {
  try {
      const DailyViolation = req.connection.models.DailyViolation;
      const violation = await DailyViolation.findById(req.params.id);
      res.status(200).json(violation || {}); // Retourne un objet vide si non trouvé
  } catch (err) {
      res.status(500).json({ error: "Erreur lors de la récupération de la violation.", details: err.message });
  }
};

// Mettre à jour une violation
exports.updateViolation = async (req, res) => {
  try {
      const DailyViolation = req.connection.models.DailyViolation;
      const violation = await DailyViolation.findByIdAndUpdate(req.params.id, req.body, { new: true });
      res.status(200).json(violation || {}); // Retourne un objet vide si non trouvé
  } catch (err) {
      res.status(500).json({ error: "Erreur lors de la mise à jour de la violation.", details: err.message });
  }
};

// Supprimer une violation
exports.deleteViolation = async (req, res) => {
  try {
      const DailyViolation = req.connection.models.DailyViolation;
      const violation = await DailyViolation.findByIdAndDelete(req.params.id);
      res.status(200).json({ message: violation ? 'Violation deleted successfully' : 'Aucune violation à supprimer.' });
  } catch (err) {
      res.status(500).json({ error: "Erreur lors de la suppression de la violation.", details: err.message });
  }
};

// Obtenir toutes les violations pour une date donnée
exports.getViolationsByDay = async (req, res) => {
  try {
      const { selectedDate } = req.query;
      if (!selectedDate) {
          return res.status(500).json({ error: 'Le paramètre selectedDate est requis.' });
      }

      const DailyViolation = req.connection.models.DailyViolation;
      const violations = await DailyViolation.find({ date: selectedDate });
      res.status(200).json(violations.length ? violations : []);
  } catch (err) {
      res.status(500).json({ error: "Erreur lors de la récupération des violations.", details: err.message });
  }
};


// Obtenir les violations hebdomadaires
exports.getWeeklyViolations = async (req, res) => {
  try {
      const DailyViolation = req.connection.models.DailyViolation;
      const { startDate } = req.query;
      if (!startDate) {
          return res.status(500).json({ error: 'Le paramètre startDate est requis.' });
      }
      const start = new Date(startDate);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);

      const violations = await DailyViolation.find({
          date: { $gte: start.toISOString().split('T')[0], $lte: end.toISOString().split('T')[0] },
      }) || [];

      const groupedData = violations.reduce((acc, violation) => {
          const violationDate = violation.date;
          if (!acc[violationDate]) {
              acc[violationDate] = {};
          }
          acc[violationDate][violation.type] = (acc[violationDate][violation.type] || 0) + 1;
          return acc;
      }, {});

      res.status(200).json(groupedData);
  } catch (err) {
      res.status(500).json({ error: "Erreur lors de la récupération des violations hebdomadaires.", details: err.message });
  }
};

// Obtenir les violations hebdomadaires pour un employé
exports.getEmployeeWeeklyViolations = async (req, res) => {
  try {
      const DailyViolation = req.connection.models.DailyViolation;
      const { startDay, idEmployee } = req.query;
      if (!startDay || !idEmployee) {
          return res.status(500).json({ error: 'Les paramètres startDay et idEmployee sont requis.' });
      }
      const start = new Date(startDay);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);

      const violations = await DailyViolation.find({
          employeeId: idEmployee,
          date: { $gte: start.toISOString().split('T')[0], $lte: end.toISOString().split('T')[0] },
      }) || [];

      const groupedData = violations.reduce((acc, violation) => {
          const violationDate = violation.date;
          if (!acc[violationDate]) {
              acc[violationDate] = {};
          }
          acc[violationDate][violation.type] = (acc[violationDate][violation.type] || 0) + 1;
          return acc;
      }, {});

      res.status(200).json(groupedData);
  } catch (err) {
      res.status(500).json({ error: "Erreur lors de la récupération des violations hebdomadaires pour l'employé.", details: err.message });
  }
};

// Obtenir les détails des violations pour un employé à une date donnée
exports.getEmployeeViolationsByDate = async (req, res) => {
  try {
      const DailyViolation = req.connection.models.DailyViolation;
      const { employeeId, date } = req.query;
      if (!employeeId || !date) {
          return res.status(500).json({ error: 'Les paramètres employeeId et date sont requis.' });
      }

      const violations = await DailyViolation.find({ employeeId, date }) || [];

      res.status(200).json(violations.length ? violations : []);
  } catch (err) {
      res.status(500).json({ error: "Erreur lors de la récupération des violations de l'employé à cette date.", details: err.message });
  }
};



exports.getAllEmployeesWeeklyViolations = async (req, res) => {
    try {
        const { startDay, employeeId } = req.query;
        if (!startDay) {
            return res.status(500).json({ error: 'Le paramètre startDay est requis.' });
        }

        const start = new Date(startDay);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);

        // Récupérer les violations pour un employé spécifique ou tous les employés
        const DailyViolation = req.connection.models.DailyViolation;
        const query = {
            date: { 
                $gte: start.toISOString().split('T')[0], 
                $lte: end.toISOString().split('T')[0] 
            }
        };

        if (employeeId) {
            query.employeeId = employeeId;
        }

        const violations = await DailyViolation.find(query) || [];

        // Grouper les données par employé et par date
        const groupedData = violations.reduce((acc, violation) => {
            const empId = violation.employeeId;
            const violationDate = violation.date;

            if (!acc[empId]) {
                acc[empId] = {};
            }

            if (!acc[empId][violationDate]) {
                acc[empId][violationDate] = {};
            }

            acc[empId][violationDate][violation.type] = 
                (acc[empId][violationDate][violation.type] || 0) + 1;
            return acc;
        }, {});

        res.status(200).json(groupedData);
    } catch (err) {
        res.status(500).json({ error: "Erreur lors de la récupération des violations hebdomadaires.", details: err.message });
    }
};
