const { log } = require('console');
const { sendPushNotification } = require('../../utils/notifications'); // Importer ta fonction d'envoi de notifications

// Créer une disponibilité
exports.createDisponibilite = async (req, res) => {
    const { employeeId, selectedDay, shiftId, expoPushToken } = req.body;
    const decisions = "pending";

    try {
        const Disponibilite = req.connection.models.Disponibilite;
        let Employe = req.connection.models.Employee;

        if (!Disponibilite) {
            return res.status(500).json({ error: 'Le modèle Disponibilite n\'est pas disponible dans la connexion actuelle.' });
        }

        // Charger dynamiquement le modèle Employe si nécessaire
        if (!Employe) {
            const employeeSchema = require('../../Employes-api/models/Employee');
            Employe = req.connection.model('Employee', employeeSchema);
        }

        const newDisponibilite = new Disponibilite({ employeeId, selectedDay, shiftId, decisions, expoPushToken });
        await newDisponibilite.save();

        res.status(200).json(newDisponibilite);

        if (expoPushToken && employeeId) {
            const employee = await Employe.findById(employeeId).select('role');
            let screen = '';

            if (employee?.role === 'manager') {
                screen = '(manager)/(tabs)/(RH)/EmployeesAvaibilities';
            } else if (employee?.role === 'driver') {
                screen = '(driver)/(tabs)/(Employe)/AcceuilEmployee';
            }

            const notificationBody = `A new availability has been created for you on ${selectedDay}. Please review it.`;

            sendPushNotification(
                expoPushToken,
                notificationBody,
                screen
            ).catch((notificationError) => {
                console.error('Erreur lors de l\'envoi de la notification push:', notificationError);
            });
        }
    } catch (err) {
        if (!res.headersSent) {
            res.status(500).json({ error: 'Erreur lors de la création de la disponibilité.', details: err.message });
        }
    }
};



// Récupérer toutes les disponibilités
exports.getAllDisponibilites = async (req, res) => {
    try {
        const Disponibilite = req.connection.models.Disponibilite;

        if (!Disponibilite) {
            return res.status(500).json({ error: 'Le modèle Disponibilite n\'est pas disponible dans la connexion actuelle.' });
        }

        const disponibilites = await Disponibilite.find() || [];
        res.status(200).json(disponibilites);
    } catch (err) {
        res.status(500).json({ error: 'Erreur lors de la récupération des disponibilités.', details: err.message });
    }
};


// Récupérer toutes les disponibilités entre deux dates (tous employés)
// Supporte soit days[] (strings déjà formatées), soit startDate/endDate (strings "Sun Sep 01 2025")
exports.getDisponibilitesInDateRange = async (req, res) => {
  try {
    const Disponibilite = req.connection.models.Disponibilite;
    if (!Disponibilite) {
      return res.status(500).json({ error: "Le modèle Disponibilite n'est pas disponible dans la connexion actuelle." });
    }

    let { days } = req.query;
    const { startDate, endDate } = req.query;

    // Normalise days en tableau de strings si déjà fourni (days[]=... ou days='["..."]')
    if (days && !Array.isArray(days)) {
      try { days = JSON.parse(days); } catch { days = [days]; }
    }

    // Si pas de days fournis, on fabrique la liste à partir de start/end (strings type "Sun Sep 01 2025")
    if (!days && startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      // Sécurise contre DST : travaille à midi local
      start.setHours(12, 0, 0, 0);
      end.setHours(12, 0, 0, 0);

      const arr = [];
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        arr.push(new Date(d).toDateString()); // => "Wed Sep 03 2025"
      }
      days = arr;
    }

    if (!days || !days.length) {
      return res.status(200).json([]); // rien à filtrer
    }

    // Construit le filtre : selectedDay est string => $in sur des strings
    const filter = { selectedDay: { $in: days } };
    

    const disponibilites = await Disponibilite.find(filter);
    return res.status(200).json(disponibilites);
  } catch (err) {
    return res.status(500).json({ error: "Erreur lors de la récupération des disponibilités.", details: err.message });
  }
};



exports.getDisponibilitesByEmployeeAndDateRange = async (req, res) => {
  const { employeeId } = req.params;
  const { startDate, endDate } = req.body;

  try {
    const Disponibilite = req.connection.models.Disponibilite;

    if (!Disponibilite) {
      return res.status(500).json({ error: 'Le modèle Disponibilite n\'est pas disponible.' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Convertir en toDateString pour correspondre au format de la BDD
    const disponibilites = await Disponibilite.find({
      employeeId,
      decisions: 'accepted'
    });

    const filtered = disponibilites.filter(d => {
      const dispoDate = new Date(d.selectedDay); // "Wed Sep 03 2025"
      return dispoDate >= start && dispoDate <= end;
    });

    // Trier les résultats par date croissante
    filtered.sort((a, b) => new Date(a.selectedDay) - new Date(b.selectedDay));

    res.status(200).json(filtered);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la récupération des disponibilités.', details: err.message });
  }
};





// Récupérer une disponibilité par ID
exports.getDisponibiliteById = async (req, res) => {
    try {
        const Disponibilite = req.connection.models.Disponibilite;

        if (!Disponibilite) {
            return res.status(500).json({ error: 'Le modèle Disponibilite n\'est pas disponible dans la connexion actuelle.' });
        }

        const disponibilite = await Disponibilite.findById(req.params.id);
        res.status(200).json(disponibilite || {}); // Retourne un objet vide si non trouvé
    } catch (err) {
        res.status(500).json({ error: 'Erreur lors de la récupération de la disponibilité.', details: err.message });
    }
};

// Récupérer plusieurs disponibilités par leurs IDs avec les infos du shift
exports.getDisponibilitesByIdsForWarning = async (req, res) => {
    try {
        const Disponibilite = req.connection.models.Disponibilite;
        const Shift = req.connection.models.Shift;

        if (!Disponibilite || !Shift) {
            return res.status(500).json({
                error: 'Modèles non disponibles dans la connexion actuelle.'
            });
        }

        const ids = req.query.ids?.split(',') || [];

        if (ids.length === 0) {
            return res.status(500).json({ error: 'Aucun ID fourni.' });
        }

        // Récupérer les disponibilités
        const disponibilites = await Disponibilite.find({ _id: { $in: ids } });

        // Pour chaque disponibilité, récupérer les infos du shift
        const disponibilitesAvecShifts = await Promise.all(
            disponibilites.map(async (dispo) => {
                const shift = await Shift.findById(dispo.shiftId);
                return {
                    ...dispo.toObject(),
                    shiftName: shift?.name || 'Shift inconnu',
                    shiftColor: shift?.color || '#000000',
                    shiftTimes: shift ? `${shift.starttime} - ${shift.endtime}` : 'Horaires inconnus'
                };
            })
        );
        res.status(200).json(disponibilitesAvecShifts);
    } catch (err) {
        console.error('Erreur:', err);
        res.status(500).json({
            error: 'Erreur lors de la récupération des disponibilités.',
            details: err.message
        });
    }
};




// Mettre à jour une disponibilité
exports.updateDisponibilite = async (req, res) => {
    const { employeeId, selectedDay, shiftId, decisions, confirmation } = req.body;

    try {
        const Disponibilite = req.connection.models.Disponibilite;

        if (!Disponibilite) {
            return res.status(500).json({ error: 'Le modèle Disponibilite n\'est pas disponible dans la connexion actuelle.' });
        }

        const updatedDisponibilite = await Disponibilite.findByIdAndUpdate(
            req.params.id,
            { employeeId, selectedDay, shiftId, decisions, confirmation },
            { new: true, runValidators: true }
        );

        res.status(200).json(updatedDisponibilite || {}); // Retourne un objet vide si non trouvé
    } catch (err) {
        res.status(500).json({ error: 'Erreur lors de la mise à jour de la disponibilité.', details: err.message });
    }
};



// Supprimer une disponibilité
exports.deleteDisponibilite = async (req, res) => {
    try {
        const Disponibilite = req.connection.models.Disponibilite;
        let Employe = req.connection.models.Employee;

        if (!Disponibilite) {
            return res.status(500).json({ error: 'Le modèle Disponibilite n\'est pas disponible dans la connexion actuelle.' });
        }

        if (!Employe) {
            const employeeSchema = require('../../Employes-api/models/Employee');
            Employe = req.connection.model('Employee', employeeSchema);
        }

        const deletedDisponibilite = await Disponibilite.findByIdAndDelete(req.params.id);

        res.status(200).json({ message: deletedDisponibilite ? 'Disponibilité supprimée avec succès.' : 'Aucune disponibilité à supprimer.' });

        // Envoi notification si le token est présent
        if (deletedDisponibilite?.expoPushToken && deletedDisponibilite?.employeeId) {
            const employee = await Employe.findById(deletedDisponibilite.employeeId).select('role');
            let screen = '';

            if (employee?.role === 'manager') {
                screen = '(manager)/(tabs)/(RH)/EmployeesAvaibilities';
            } else if (employee?.role === 'driver') {
                screen = '(driver)/(tabs)/(Employe)/AcceuilEmployee';
            }

            const notificationBody = `Your availability on ${deletedDisponibilite.selectedDay} has been deleted.`;

            sendPushNotification(
                deletedDisponibilite.expoPushToken,
                notificationBody,
                screen
            ).catch((notificationError) => {
                console.error('Erreur lors de l\'envoi de la notification push:', notificationError);
            });
        }
    } catch (err) {
        res.status(500).json({ error: 'Erreur lors de la suppression de la disponibilité.', details: err.message });
    }
};





// Supprimer les disponibilités par shiftId
exports.deleteDisponibilitesByShiftId = async (req, res) => {
    const { shiftId } = req.params;

    try {
        const Disponibilite = req.connection.models.Disponibilite;
        let Employe = req.connection.models.Employee;

        if (!Disponibilite) {
            return res.status(500).json({ error: 'Le modèle Disponibilite n\'est pas disponible dans la connexion actuelle.' });
        }

        // Charger dynamiquement le modèle Employe si nécessaire
        if (!Employe) {
            const employeeSchema = require('../../Employes-api/models/Employee');
            Employe = req.connection.model('Employee', employeeSchema);
        }

        // Récupérer les disponibilités avant suppression pour envoyer les notifications
        const disponibilites = await Disponibilite.find({ shiftId });

        // Supprimer les disponibilités
        const deletedDisponibilites = await Disponibilite.deleteMany({ shiftId });

        res.status(200).json({
            message: deletedDisponibilites.deletedCount
                ? `${deletedDisponibilites.deletedCount} disponibilités supprimées avec succès.`
                : 'Aucune disponibilité trouvée avec cet shiftId.'
        });

        // Envoyer les notifications après la suppression
        for (const disponibilite of disponibilites) {
            if (disponibilite.expoPushToken && disponibilite.employeeId) {
                try {
                    const employee = await Employe.findById(disponibilite.employeeId).select('role');
                    let screen = '';

                    if (employee?.role === 'manager') {
                        screen = '(manager)/(tabs)/(RH)/EmployeesAvaibilities';
                    } else if (employee?.role === 'driver') {
                        screen = '(driver)/(tabs)/(Employe)/AcceuilEmployee';
                    }

                    const notificationBody = `Your availability on ${disponibilite.selectedDay} has been deleted.`;

                    await sendPushNotification(
                        disponibilite.expoPushToken,
                        notificationBody,
                        screen
                    );
                } catch (error) {
                    console.error('Erreur lors de l\'envoi de la notification push:', error);
                }
            }
        }

    } catch (err) {
        res.status(500).json({ error: 'Erreur lors de la suppression des disponibilités.', details: err.message });
    }
};






// Mettre à jour plusieurs disponibilités
exports.updateMultipleDisponibilites = async (req, res) => {
    const { decisions } = req.body; // Tableau de décisions avec employeeId, selectedDay, shiftId, et status
    try {
        const Disponibilite = req.connection.models.Disponibilite;
        let Employe = req.connection.models.Employee;

        if (!Disponibilite) {
            return res.status(500).json({ error: 'Le modèle Disponibilite n\'est pas disponible dans la connexion actuelle.' });
        }

        // Charger dynamiquement le modèle Employe si nécessaire
        if (!Employe) {
            const employeeSchema = require('../../Employes-api/models/Employee');
            Employe = req.connection.model('Employee', employeeSchema);
        }

        const updatePromises = decisions.map(async (decision) => {
            const oldDisponibilite = await Disponibilite.findOne({ employeeId: decision.employeeId, selectedDay: decision.selectedDay });

            if (!oldDisponibilite || oldDisponibilite.decisions === decision.status) {
                return null;
            }

            const updatedDisponibilite = await Disponibilite.findOneAndUpdate(
                { employeeId: decision.employeeId, selectedDay: decision.selectedDay },
                { decisions: decision.status },
                { new: true, runValidators: true }
            );

            if (updatedDisponibilite?.expoPushToken && decision.employeeId) {
                try {
                    const employee = await Employe.findById(decision.employeeId).select('role');
                    let screen = '';

                    if (employee?.role === 'manager') {
                        screen = '(manager)/(tabs)/(RH)/EmployeesAvaibilities';
                    } else if (employee?.role === 'driver') {
                        screen = '(driver)/(tabs)/(Employe)/AcceuilEmployee';
                    }

                    const notificationBody = `Your availability for ${updatedDisponibilite.selectedDay} has been ${decision.status}.`;

                    await sendPushNotification(
                        updatedDisponibilite.expoPushToken,
                        notificationBody,
                        screen
                    );
                } catch (error) {
                    console.error('Erreur lors de l\'envoi de la notification push:', error);
                }
            }

            return updatedDisponibilite;
        });

        const results = await Promise.all(updatePromises);
        const updatedDisponibilites = results.filter(dispo => dispo !== null);

        res.status(200).json({
            message: `${updatedDisponibilites.length} disponibilités mises à jour avec succès`,
            updatedDisponibilites
        });
    } catch (err) {
        res.status(500).json({ error: 'Erreur lors de la mise à jour des disponibilités.', details: err.message });
    }
};





// Récupérer toutes les disponibilités d'un employé par employeeId
exports.getDisponibilitesByEmployeeId = async (req, res) => {
    const { employeeId } = req.params;

    try {
        const Disponibilite = req.connection.models.Disponibilite;

        if (!Disponibilite) {
            return res.status(500).json({ error: 'Le modèle Disponibilite n\'est pas disponible dans la connexion actuelle.' });
        }

        const disponibilites = await Disponibilite.find({ employeeId }) || [];

        res.status(200).json(disponibilites);
    } catch (err) {
        res.status(500).json({ error: 'Erreur lors de la récupération des disponibilités.', details: err.message });
    }
};





// Récupérer toutes les disponibilités par jour et employeeId
exports.getDisponibilitesByEmployeeAndDay = async (req, res) => {
    const { employeeId, selectedDay } = req.params;

    try {
        const Disponibilite = req.connection.models.Disponibilite;

        if (!Disponibilite) {
            return res.status(500).json({ error: 'Le modèle Disponibilite n\'est pas disponible dans la connexion actuelle.' });
        }

        const disponibilites = await Disponibilite.find({
            employeeId,
            selectedDay: new Date(selectedDay).toDateString(),
        }) || [];

        res.status(200).json(disponibilites);
    } catch (err) {
        res.status(500).json({ error: 'Erreur lors de la récupération des disponibilités.', details: err.message });
    }
};




// Bulk update disponibilites confirmation
exports.updateMultipleDisponibilitesConfirmation = async (req, res) => {
    const { confirmations } = req.body;

    try {
        const Disponibilite = req.connection.models.Disponibilite;
        let Employe = req.connection.models.Employee;

        if (!Disponibilite) {
            return res.status(500).json({ error: 'Le modèle Disponibilite n\'est pas disponible dans la connexion actuelle.' });
        }

        // Charger dynamiquement le modèle Employe si nécessaire
        if (!Employe) {
            const employeeSchema = require('../../Employes-api/models/Employee');
            Employe = req.connection.model('Employee', employeeSchema);
        }

        const updatePromises = confirmations.map(async (confirmation) => {
            try {
                const dispo = await Disponibilite.findOne({
                    employeeId: confirmation.employeeId,
                    selectedDay: confirmation.selectedDay,
                    shiftId: confirmation.shiftId
                });

                if (dispo && 'presence' in dispo) {
                    await Disponibilite.updateOne(
                        {
                            employeeId: confirmation.employeeId,
                            selectedDay: confirmation.selectedDay,
                            shiftId: confirmation.shiftId
                        },
                        { $unset: { presence: "" } }
                    );
                }

                const updatedDispo = await Disponibilite.findOneAndUpdate(
                    {
                        employeeId: confirmation.employeeId,
                        selectedDay: confirmation.selectedDay,
                        shiftId: confirmation.shiftId
                    },
                    {
                        confirmation: confirmation.status,
                        seen: confirmation.seen
                    },
                    { new: true, runValidators: true }
                );

                // 🔔 Envoi de notification avec le token de l'employé
                if (confirmation.employeeId) {
                    const employee = await Employe.findById(confirmation.employeeId).select('role expoPushToken');

                    if (employee?.expoPushToken) {
                        let screen = '';

                        if (employee.role === 'manager') {
                            screen = '(manager)/(tabs)/(Dispatcher)/Confirmation';
                        } else if (employee.role === 'driver') {
                            screen = '(driver)/(tabs)/(Employe)/AcceuilEmployee';
                        }

                        const statusMessage = `🚨 Urgent: Verify your shift for ${updatedDispo.selectedDay} as it needs your immediate action.`;

                        await sendPushNotification(
                            employee.expoPushToken,
                            statusMessage,
                            screen
                        );
                    }
                }

                return updatedDispo;

            } catch (err) {
                console.error('Erreur lors de la vérification et mise à jour:', err);
                return null;
            }
        });

        const updatedDisponibilites = (await Promise.all(updatePromises)).filter(dispo => dispo !== null);

        res.status(200).json({ message: 'Disponibilites updated successfully', updatedDisponibilites });

    } catch (err) {
        res.status(500).json({ error: 'Erreur lors de la mise à jour des disponibilités.', details: err.message });
    }
};




// Update the presence of a disponibilite by ID
exports.updateDisponibilitePresenceById = async (req, res) => {
    const { presence } = req.body;

    try {
        const Disponibilite = req.connection.models.Disponibilite;
        if (!Disponibilite) {
            return res.status(500).json({ error: 'The Disponibilite model is not available in the current connection.' });
        }

        // 🔥 Check if Employee model is initialized
        let Employee = req.connection.models.Employee;
        if (!Employee) {
            const employeeSchema = require('../../Employes-api/models/Employee');
            Employee = req.connection.model('Employee', employeeSchema);
        }

        // 🔥 Update the presence in the database
        const disponibilite = await Disponibilite.findByIdAndUpdate(
            req.params.id,
            { presence },
            { new: true, runValidators: true }
        );

        // ✅ Fetch employee details
        const employee = await Employee.findById(disponibilite.employeeId).select('name familyName');

        // ✅ Emit real-time update via Socket.IO
        const io = req.app.get('socketio');
        io.emit('presenceUpdated', {
            disponibiliteId: disponibilite._id,
            presence: disponibilite.presence
        });

        // ✅ 🔥 If presence is NOT confirmed, notify managers
        if (disponibilite.presence !== 'confirmed') {
            const managers = await Employee.find({ role: 'manager' }).select('expoPushToken');

            for (const manager of managers) {
                if (manager.expoPushToken) {
                    const notificationBody = `${employee?.name} ${employee?.familyName} has declined to work on ${disponibilite.selectedDay}.`;

                    await sendPushNotification(
                        manager.expoPushToken,
                        notificationBody,
                        '(manager)/(tabs)/(Dispatcher)/Confirmation'
                    );
                }
            }
        }

        res.status(200).json(disponibilite);

    } catch (err) {
        console.error('Error updating presence:', err.message);
        res.status(500).json({ error: 'Error updating presence.', details: err.message });
    }
};






// Récupérer toutes les disponibilités acceptées par date
exports.getDisponibilitesByDate = async (req, res) => {
    const { selectedDay } = req.query;

    try {
        const Disponibilite = req.connection.models.Disponibilite;

        if (!Disponibilite) {
            return res.status(500).json({ error: 'Le modèle Disponibilite n\'est pas disponible dans la connexion actuelle.' });
        }

        const disponibilites = await Disponibilite.find({
            selectedDay: new Date(selectedDay).toDateString(),
            decisions: 'accepted',
        }) || [];

        res.status(200).json(disponibilites);
    } catch (err) {
        res.status(500).json({ error: 'Erreur lors de la récupération des disponibilités.', details: err.message });
    }
};


// Récupérer toutes les disponibilités confirmées par jour
exports.getConfirmedDisponibilitesByDay = async (req, res) => {
    const { selectedDay } = req.query;

    try {
        const Disponibilite = req.connection.models.Disponibilite;

        if (!Disponibilite) {
            return res.status(500).json({ error: 'Le modèle Disponibilite n\'est pas disponible dans la connexion actuelle.' });
        }

        const disponibilites = await Disponibilite.find({
            selectedDay: new Date(selectedDay).toDateString(),
            confirmation: "confirmed",
            presence: "confirmed"
        }) || [];

        res.status(200).json(disponibilites);
    } catch (err) {
        res.status(500).json({ error: 'Erreur lors de la récupération des disponibilités confirmées.', details: err.message });
    }
};



exports.getDisponibilitesAfterDate = async (req, res) => {
    const { employeeId, selectedDate } = req.params;

    try {
        // Validation des paramètres
        if (!employeeId || !selectedDate) {
            return res.status(500).json({
                message: 'Employee ID and selected date are required.',
            });
        }

        // Charger dynamiquement le modèle Disponibilite
        const Disponibilite = req.connection.models.Disponibilite;
        const Shift = req.connection.models.Shift;

        if (!Disponibilite || !Shift) {
            return res.status(500).json({
                message: 'Required models are not available in the current connection.',
            });
        }

        // Convertir la date de requête en objet Date
        const formattedDate = new Date(selectedDate);

        if (isNaN(formattedDate.getTime())) {
            return res.status(500).json({
                message: 'Invalid date format.',
            });
        }

        // Récupérer les disponibilités
        const disponibilites = await Disponibilite.find({ employeeId });

        // Filtrer les disponibilités en comparant les dates
        const disponibilitesFiltrees = disponibilites.filter((dispo) => {
            const dispoDate = new Date(dispo.selectedDay); // Convertir `selectedDay` en objet Date
            return dispoDate > formattedDate; // Comparer les dates
        });

        // Trier les résultats par date croissante
        disponibilitesFiltrees.sort((a, b) => new Date(a.selectedDay) - new Date(b.selectedDay));
        // Associer les détails de shift pour chaque dispo
        const disponibilitesAvecShifts = await Promise.all(
            disponibilitesFiltrees.map(async (dispo) => {
                const shiftDetails = await Shift.findById(dispo.shiftId);
                return {
                    ...dispo.toObject(),
                    shiftDetails,
                };
            })
        );

        res.status(200).json(disponibilitesAvecShifts);
    } catch (err) {
        res.status(500).json({ error: 'An error occurred while fetching disponibilites.' });
    }
};

// Ajouter ou mettre à jour l'attribut suspension pour une liste d'IDs de disponibilités
exports.updateDisponibilitesSuspension = async (req, res) => {
    const { disponibiliteIds, suspension } = req.body; // Liste des IDs de disponibilités et le statut de suspension (true/false)
    try {
        // Charger dynamiquement le modèle Disponibilite
        const Disponibilite = req.connection.models.Disponibilite;

        if (!Disponibilite) {
            return res.status(500).json({ message: 'Disponibilite model is not available in the current connection.' });
        }

        // Vérifier que les IDs sont valides
        if (!Array.isArray(disponibiliteIds) || typeof suspension !== 'boolean') {
            return res.status(500).json({ message: 'Invalid request format. Expecting an array of IDs and a boolean suspension value.' });
        }

        // Mettre à jour les disponibilités en parallèle
        const updatePromises = disponibiliteIds.map((id) => {
            return Disponibilite.findByIdAndUpdate(
                id,
                { suspension },
                { new: true, runValidators: true }
            );
        });

        // Attendre la résolution de toutes les promesses
        const updatedDisponibilites = await Promise.all(updatePromises);

        // Filtrer les disponibilités non trouvées
        const notFound = updatedDisponibilites.filter(dispo => !dispo);

        res.status(200).json({
            message: `${updatedDisponibilites.length - notFound.length} disponibilites updated successfully.`,
            updatedDisponibilites,
            notFound: notFound.map((_, index) => disponibiliteIds[index]) // Retourner les IDs non trouvés
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};



// Mettre à jour le statut `seen` d'une disponibilité
exports.updateDisponibiliteSeen = async (req, res) => {
    try {
        const Disponibilite = req.connection.models.Disponibilite;

        if (!Disponibilite) {
            return res.status(500).json({ error: 'Le modèle Disponibilite n\'est pas disponible dans la connexion actuelle.' });
        }

        // ✅ Mise à jour du statut `seen` à `true`
        const updatedDisponibilite = await Disponibilite.findByIdAndUpdate(
            req.params.id,
            { seen: true },
            { new: true, runValidators: true }
        );

        if (!updatedDisponibilite) {
            return res.status(500).json({ error: 'Disponibilite non trouvée.' });
        }

        // ✅ Émission de l'événement en temps réel via Socket.IO
        const io = req.app.get('socketio');
        io.emit('seenUpdated', {
            disponibiliteId: updatedDisponibilite._id,
            seen: updatedDisponibilite.seen
        });

        res.status(200).json(updatedDisponibilite);

    } catch (err) {
        res.status(500).json({ error: 'Erreur lors de la mise à jour du statut seen.', details: err.message });
    }
};

// Ajouter la suspension
exports.suspendDisponibilites = async (req, res) => {

    try {
        const Disponibilite = req.connection.models.Disponibilite;
        const { disponibiliteIds = [] } = req.body;

        if (disponibiliteIds.length === 0) {
            return res.status(500).json({ error: 'Aucun ID fourni.' });
        }

        const result = await Disponibilite.updateMany(
            { _id: { $in: disponibiliteIds } },
            { $set: { suspension: true } }
        );


        res.status(200).json({ success: true, message: 'Dispos suspendues.' });
    } catch (err) {
        res.status(500).json({ error: 'Erreur lors de la suspension.', details: err.message });
    }
};

exports.unsuspendDisponibilites = async (req, res) => {
    try {
        const Disponibilite = req.connection.models.Disponibilite;
        const { disponibiliteIds = [] } = req.body;

        // Sécurisation des IDs mal encodés
        let idsToUse = disponibiliteIds.flatMap(id => {
            try {
                if (typeof id === 'string' && id.startsWith('[')) {
                    return JSON.parse(id);
                } else {
                    return [id];
                }
            } catch (e) {
                console.error("❌ Mauvais format d'ID à parser:", id);
                return [];
            }
        });


        if (idsToUse.length === 0) {
            return res.status(500).json({ error: 'Aucun ID valide fourni.' });
        }

        const result = await Disponibilite.updateMany(
            { _id: { $in: idsToUse } },
            { $set: { suspension: false } }
        );

        res.status(200).json({ success: true, message: 'Dispos réactivées.' });
    } catch (err) {
        res.status(500).json({ error: 'Erreur lors de la désactivation.', details: err.message });
    }
};


