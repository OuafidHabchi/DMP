const { Types } = require('mongoose');

exports.getEmployeesDisponibilitesByDateRange = async (req, res) => {
    const { start_date, end_date, dsp_code } = req.query;

    try {
        const Disponibilite = req.connection.models.Disponibilite;
        const Employee = req.connection.models.Employee || req.connection.model('Employee', require('../../../Employes-api/models/Employee'));
        const Shift = req.connection.models.Shift || req.connection.model('Shift', require('../../../Shifts-api/models/shift'));

        if (!Disponibilite || !Employee || !Shift) {
            return res.status(500).json({ error: 'Les modèles nécessaires ne sont pas disponibles dans la connexion actuelle.' });
        }

        const startDate = new Date(start_date);
        const endDate = new Date(end_date);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            return res.status(400).json({ error: 'Format de date invalide.' });
        }

        // Générer toutes les dates intermédiaires au format string
        const dateList = [];
        let d = new Date(startDate);
        while (d <= endDate) {
            dateList.push(d.toDateString());
            d.setDate(d.getDate() + 1);
        }

        // Récupérer les disponibilités
        const disponibilites = await Disponibilite.find({
            selectedDay: { $in: dateList }
        });

        if (disponibilites.length === 0) {
            return res.status(200).json([]);
        }

        // Récupérer les employés
        const employeeIds = [...new Set(disponibilites.map(d => d.employeeId.toString()))];

        const employeeFilter = { _id: { $in: employeeIds.map(id => new Types.ObjectId(id)) } };
        if (dsp_code) employeeFilter.dsp_code = dsp_code;

        const employees = await Employee.find(employeeFilter);

        const employeeMap = {};
        employees.forEach(emp => {
            employeeMap[emp._id.toString()] = {
                name: `${emp.name} ${emp.familyName}`,
                dsp_code: emp.dsp_code
            };
        });

        // Récupérer les shifts
        const shiftIds = [...new Set(disponibilites.map(d => d.shiftId.toString()))];

        const shifts = await Shift.find({ _id: { $in: shiftIds.map(id => new Types.ObjectId(id)) } });

        const shiftMap = {};
        shifts.forEach(shift => {
            shiftMap[shift._id.toString()] = {
                name: shift.name,
                color: shift.color // Ajout de la couleur si disponible
            };
        });

        // Construction du résultat groupé par jour et par shift
        const groupedResult = {};

        disponibilites.forEach(dispo => {
            const employeeInfo = employeeMap[dispo.employeeId.toString()] || {
                name: 'Employé inconnu',
                dsp_code: 'N/A'
            };

            const shiftInfo = shiftMap[dispo.shiftId.toString()] || {
                name: 'Shift inconnu',
                color: '#cccccc'
            };

            const day = dispo.selectedDay;
            const shiftName = shiftInfo.name;

            if (!groupedResult[day]) {
                groupedResult[day] = {};
            }

            if (!groupedResult[day][shiftName]) {
                groupedResult[day][shiftName] = {
                    shift_id: dispo.shiftId,
                    shift_color: shiftInfo.color,
                    employees: []
                };
            }

            groupedResult[day][shiftName].employees.push({
                employee_id: dispo.employeeId,
                employee_name: employeeInfo.name,
                status: dispo.decisions || 'N/A',
                confirmation: dispo.confirmation || false,
                presence: dispo.presence || false,
                suspension: dispo.suspension || false
            });
        });

        // Convertir en format array trié
        const finalResult = dateList.map(day => {
            if (!groupedResult[day]) {
                return {
                    day,
                    shifts: []
                };
            }

            const shiftsForDay = Object.entries(groupedResult[day]).map(([shiftName, shiftData]) => ({
                shift_name: shiftName,
                shift_id: shiftData.shift_id,
                shift_color: shiftData.shift_color,
                employee_count: shiftData.employees.length,
                employees: shiftData.employees
            }));

            // Trier les shifts par nom
            shiftsForDay.sort((a, b) => a.shift_name.localeCompare(b.shift_name));

            return {
                day,
                shifts: shiftsForDay
            };
        });
        res.status(200).json(finalResult);

    } catch (err) {
        console.error('Erreur:', err);
        res.status(500).json({
            error: 'Erreur lors de la récupération des disponibilités.',
            details: err.message
        });
    }
};



exports.getEmployeesPresenceByDate = async (req, res) => {
    try {
        const { date, dsp_code } = req.query;
        if (!date) {
            return res.status(400).json({ error: 'Le paramètre "date" est requis.' });
        }

        const Disponibilite = req.connection.models.Disponibilite;
        const Employee = req.connection.models.Employee || req.connection.model('Employee', require('../../../Employes-api/models/Employee'));
        const Shift = req.connection.models.Shift || req.connection.model('Shift', require('../../../Shifts-api/models/shift'));

        if (!Disponibilite || !Employee || !Shift) {
            return res.status(500).json({ error: 'Les modèles nécessaires ne sont pas disponibles dans la connexion actuelle.' });
        }


        // Formater la date au format attendu dans la base (exemple : "Thu Jun 26 2025")
        const [year, month, day] = date.split('-').map(Number);
        const targetDate = new Date(year, month - 1, day);
        if (isNaN(targetDate.getTime())) {
            return res.status(400).json({ error: 'Format de date invalide.' });
        }
        const selectedDayStr = targetDate.toDateString();
        // Trouver les disponibilités du jour avec confirmation = "confirmed"
        const disponibilites = await Disponibilite.find({
            selectedDay: selectedDayStr,
            confirmation: "confirmed"
        });

        if (disponibilites.length === 0) {
            return res.status(200).json([]);
        }

        // Extraire les shiftIds et employeeIds uniques
        const shiftIds = [...new Set(disponibilites.map(d => d.shiftId))];
        const employeeIds = [...new Set(disponibilites.map(d => d.employeeId))];

        // Construire filtre employés (optionnel selon dsp_code)
        const employeeFilter = { _id: { $in: employeeIds } };
        if (dsp_code) {
            employeeFilter.dsp_code = dsp_code;
        }

        // Récupérer les employés concernés
        const employees = await Employee.find(employeeFilter);
        const employeeMap = {};
        employees.forEach(emp => {
            employeeMap[emp._id.toString()] = `${emp.name} ${emp.familyName}`;
        });

        // Récupérer les shifts concernés
        const shifts = await Shift.find({ _id: { $in: shiftIds } });
        const shiftMap = {};
        shifts.forEach(shift => {
            shiftMap[shift._id.toString()] = {
                name: shift.name,
                color: shift.color || '#cccccc',
                id: shift._id.toString()
            };
        });

        // Grouper par shift
        const grouped = {};

        disponibilites.forEach(d => {
            const shiftIdStr = d.shiftId.toString();
            if (!shiftMap[shiftIdStr]) return; // Ignore si shift inconnu ou filtré

            if (!grouped[shiftIdStr]) {
                grouped[shiftIdStr] = {
                    shift_id: shiftIdStr,
                    shift_name: shiftMap[shiftIdStr].name,
                    shift_color: shiftMap[shiftIdStr].color,
                    confirmed_count: 0,
                    pending_employees: []
                };
            }

            const empName = employeeMap[d.employeeId.toString()] || "Employé inconnu";

            if (d.presence === "confirmed") {
                grouped[shiftIdStr].confirmed_count++;
            } else {
                grouped[shiftIdStr].pending_employees.push({
                    employee_id: d.employeeId,
                    employee_name: empName
                });
            }
        });

        // Transformer en tableau
        const result = Object.values(grouped);
        return res.status(200).json(result);

    } catch (err) {
        console.error('Erreur:', err);
        res.status(500).json({ error: 'Erreur lors de la récupération des présences.', details: err.message });
    }
};




exports.getDisposNotWorkedByDate = async (req, res) => {
    console.log("getDisposNotWorkedByDate called with query:", req.query);
    try {
        const { date } = req.query;
        if (!date) {
            return res.status(400).json({ error: 'Le paramètre "date" est requis.' });
        }

        const Disponibilite = req.connection.models.Disponibilite;
        const TimeCard = req.connection.models.TimeCard;
        const Employee = req.connection.models.Employee;
        const Shift = req.connection.models.Shift;




        const [year, month, day] = date.split('-').map(Number);
        const formattedDate = new Date(year, month - 1, day).toDateString();

        const disponibilites = await Disponibilite.find({ selectedDay: formattedDate });
        if (disponibilites.length === 0) {
            return res.status(200).json([]);
        }
       

        const dispoEmployeeIds = [...new Set(disponibilites.map(d => d.employeeId.toString()))];
        const shiftIds = [...new Set(disponibilites.map(d => d.shiftId.toString()))];

        const timeCards = await TimeCard.find({ day: formattedDate });
        const workedEmployeeIds = new Set(timeCards.map(tc => tc.employeeId.toString()));

        const absents = disponibilites.filter(d => !workedEmployeeIds.has(d.employeeId.toString()));
        if (absents.length === 0) {
            return res.status(200).json([]);
        }

        const employees = await Employee.find({ _id: { $in: dispoEmployeeIds } });
        const employeeMap = {};
        employees.forEach(emp => {
            employeeMap[emp._id.toString()] = `${emp.name} ${emp.familyName}`;
        });

        const shifts = await Shift.find({ _id: { $in: shiftIds } });
        const shiftMap = {};
        shifts.forEach(shift => {
            shiftMap[shift._id.toString()] = shift.name;
        });

        // Regrouper par shift
        const groupedResult = {};
        absents.forEach(d => {
            const shiftName = shiftMap[d.shiftId.toString()] || "Shift inconnu";
            const empName = employeeMap[d.employeeId.toString()] || "Employé inconnu";

            if (!groupedResult[shiftName]) {
                groupedResult[shiftName] = [];
            }
            groupedResult[shiftName].push(empName);
        });

        // Transformer en tableau formaté
        const response = Object.entries(groupedResult).map(([shift_name, employees]) => ({
            shift_name,
            employees
        }));

        res.status(200).json(response);

    } catch (error) {
        console.error("Erreur dans getDisposNotWorkedByDate:", error);
        res.status(500).json({
            error: "Erreur serveur lors de l'analyse des disponibilités non travaillées.",
            details: error.message
        });
    }
};




exports.getOverworkedEmployeesByDate = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ error: 'Le paramètre "date" est requis.' });
    }

    const TimeCard = req.connection.models.TimeCard;
    const Employee = req.connection.models.Employee;

    // 1. Formatter la date
    const [year, month, day] = date.split('-').map(Number);
    const formattedDate = new Date(year, month - 1, day).toDateString();

    // 2. Récupérer tous les TimeCards pour cette date
    const timeCards = await TimeCard.find({ day: formattedDate });

    const groupResult = {
      moins_1h: [],
      plus_1h: []
    };

    // 3. Charger les employés concernés
    const employeeIds = [...new Set(timeCards.map(tc => tc.employeeId))];
    const employees = await Employee.find({ _id: { $in: employeeIds } });
    const employeeMap = {};
    employees.forEach(emp => {
      employeeMap[emp._id.toString()] = `${emp.name} ${emp.familyName}`;
    });

    // 4. Traiter chaque timecard
    for (const card of timeCards) {
      const { startTime, endTime, CortexDuree, employeeId } = card;

      if (!startTime || !endTime || !CortexDuree) continue;

      // Convertir HH:MM en minutes
      const toMinutes = (str) => {
        const [h, m] = str.split(':').map(Number);
        return h * 60 + m;
      };

      const workedMinutes = toMinutes(endTime) - toMinutes(startTime);
      const expectedMinutes = toMinutes(CortexDuree);

      const overworked = workedMinutes - expectedMinutes;

      if (overworked <= 0) continue; // Pas de dépassement

      const empName = employeeMap[employeeId.toString()] || "Employé inconnu";

      const formatMinutes = (m) => {
        const h = Math.floor(m / 60);
        const min = m % 60;
        return `${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
      };

      const info = {
        employee_name: empName,
        ecart: formatMinutes(overworked),
        duree_travaillee: formatMinutes(workedMinutes),
        duree_attendue: CortexDuree
      };

      if (overworked <= 60) {
        groupResult.moins_1h.push(info);
      } else {
        groupResult.plus_1h.push(info);
      }
    }

    res.status(200).json(groupResult);

  } catch (error) {
    console.error("Erreur dans getOverworkedEmployeesByDate:", error);
    res.status(500).json({
      error: "Erreur serveur lors de l'analyse des dépassements de durée.",
      details: error.message
    });
  }
};

