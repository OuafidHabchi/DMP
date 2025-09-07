const { sendPushNotification } = require('../../utils/notifications'); // Importer ta fonction d'envoi de notifications

// Créer une disponibilité
exports.createDisponibilite = async (req, res) => {
    const { employeeId, selectedDay, shiftId } = req.body;
    publish = false
    confirmation = false
    seen = false
    canceled = false


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

        const newDisponibilite = new Disponibilite({ employeeId, selectedDay, shiftId, publish, confirmation, seen, canceled });
        await newDisponibilite.save();

        res.status(200).json(newDisponibilite);


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



// helper: ramène n’importe quelle entrée (string/date) au minuit local du jour
const toLocalDateOnly = (v) => {
    const d = new Date(v);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()); // 00:00 local
};

exports.getDisponibilitesByEmployeeAndDateRange = async (req, res) => {
    const { employeeId } = req.params;
    const { startDate, endDate } = req.body;

    try {
        const Disponibilite = req.connection.models.Disponibilite;
        if (!Disponibilite) {
            return res.status(500).json({ error: "Le modèle Disponibilite n'est pas disponible." });
        }

        // bornes inclusives en local : [start 00:00, end 23:59:59.999]
        const start = toLocalDateOnly(startDate);
        const end = new Date(toLocalDateOnly(endDate).getTime() + 24 * 60 * 60 * 1000 - 1);

        const disponibilites = await Disponibilite.find({ employeeId, publish: true });

        const filtered = disponibilites.filter((d) => {
            const dd = toLocalDateOnly(d.selectedDay); // "Wed Sep 03 2025" → 00:00 local
            return dd >= start && dd <= end; // inclusif
        });

        filtered.sort((a, b) => toLocalDateOnly(a.selectedDay) - toLocalDateOnly(b.selectedDay));
        res.status(200).json(filtered);
    } catch (err) {
        res.status(500).json({ error: "Erreur lors de la récupération des disponibilités.", details: err.message });
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





// Mettre à jour confirmation d'une disponibilité
exports.confirmDisponibilite = async (req, res) => {
    try {
        const Disponibilite = req.connection.models.Disponibilite;

        if (!Disponibilite) {
            return res
                .status(500)
                .json({ error: "Le modèle Disponibilite n'est pas disponible." });
        }

        const dispoId = req.params.id;
        console.log(dispoId)
        if (!dispoId) {
            return res.status(400).json({ error: "L'ID de la disponibilité est requis." });
        }

        const updatedDisponibilite = await Disponibilite.findByIdAndUpdate(
            dispoId,
            { confirmation: true }, // ⚡ Forcé
            { new: true, runValidators: true }
        );

        if (!updatedDisponibilite) {
            return res.status(404).json({ error: "Disponibilité non trouvée." });
        }

        res.status(200).json(updatedDisponibilite);
    } catch (err) {
        res.status(500).json({
            error: "Erreur lors de la mise à jour de la disponibilité.",
            details: err.message,
        });
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



    } catch (err) {
        res.status(500).json({ error: 'Erreur lors de la suppression des disponibilités.', details: err.message });
    }
};






// Mettre à jour plusieurs disponibilités (publish -> true) + notifier l'employé
exports.updateMultipleDisponibilites = async (req, res) => {
    const { decisions } = req.body; // [{ dispoId, employeeId }, ...]
    try {
        if (!Array.isArray(decisions) || decisions.length === 0) {
            return res.status(400).json({ error: 'decisions must be a non-empty array' });
        }

        const Disponibilite = req.connection.models.Disponibilite;
        let Employe = req.connection.models.Employee;

        if (!Disponibilite) {
            return res
                .status(500)
                .json({ error: "Le modèle Disponibilite n'est pas disponible dans la connexion actuelle." });
        }

        // Charger dynamiquement le modèle Employe si nécessaire
        if (!Employe) {
            const employeeSchema = require('../../Employes-api/models/Employee');
            Employe = req.connection.model('Employee', employeeSchema);
        }

        // Traite chaque décision : set publish=true sur la dispo (_id=dispoId)
        const updatePromises = decisions.map(async (d) => {
            if (!d?.dispoId || !d?.employeeId) {
                // entrée invalide -> on ignore cette ligne proprement
                return { updated: null, notified: false, reason: 'missing ids' };
            }

            // 1) MAJ publish à true
            const updated = await Disponibilite.findOneAndUpdate(
                { _id: d.dispoId },
                { $set: { publish: true } },
                { new: true, runValidators: true }
            );

            // si pas trouvé, on arrête là pour cette entrée
            if (!updated) return { updated: null, notified: false, reason: 'dispo not found' };

            // 2) Récupérer l’employé pour le token et le rôle
            const employee = await Employe.findById(d.employeeId).select('expoPushToken role');
            if (!employee?.expoPushToken) {
                return { updated, notified: false, reason: 'no token' };
            }

            // 3) Choisir l’écran selon le rôle (on garde la même logique)
            let screen = '';
            if (employee.role === 'manager') {
                screen = '(manager)/(tabs)/(RH)/Schedule';
            } else if (employee.role === 'driver') {
                screen = '(driver)/(tabs)/(Employe)/AcceuilEmployee';
            }

            // 4) Message: weekly schedule published
            const body = 'Your weekly schedule has been published.'; // FR possible si besoin

            try {
                await sendPushNotification(employee.expoPushToken, body, screen);
                return { updated, notified: true };
            } catch (err) {
                console.error('Erreur notification push:', err);
                return { updated, notified: false, reason: 'push error' };
            }
        });

        const results = await Promise.all(updatePromises);

        const updatedCount = results.filter(r => r.updated).length;
        const notifiedCount = results.filter(r => r.notified).length;

        return res.status(200).json({
            message: `${updatedCount} disponibilités publiées (publish=true). Notifications envoyées: ${notifiedCount}.`,
            details: results,
        });
    } catch (err) {
        console.error(err);
        return res
            .status(500)
            .json({ error: 'Erreur lors de la mise à jour des disponibilités.', details: err.message });
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




// Bulk update disponibilites confirmation (nouveau format: req.body.updates)
exports.updateMultipleDisponibilitesConfirmation = async (req, res) => {
    // ✅ nouveau champ "updates" (on garde un fallback "confirmations" au cas où)
    const rawUpdates = Array.isArray(req.body.updates)
        ? req.body.updates
        : [];

    if (!rawUpdates.length) {
        return res.status(400).json({
            error: "No updates provided. Expecting { updates: [{disponibiliteId, employeeId, confirmation, canceled, seen}] }",
        });
    }

    try {
        const Disponibilite = req.connection.models.Disponibilite;
        let Employe = req.connection.models.Employee;

        if (!Disponibilite) {
            return res.status(500).json({
                error: "Le modèle Disponibilite n'est pas disponible dans la connexion actuelle.",
            });
        }

        // Charger dynamiquement le modèle Employee si nécessaire
        if (!Employe) {
            const employeeSchema = require('../../Employes-api/models/Employee');
            Employe = req.connection.model('Employee', employeeSchema);
        }

        const updatePromises = rawUpdates.map(async (u) => {
            const { disponibiliteId, employeeId, confirmation, canceled, seen } = u || {};

            if (!disponibiliteId || !employeeId) {
                return null; // on ignore les entrées incomplètes
            }

            try {
                // On unset systématiquement presence (pas d'effet si absent)
                const updatedDispo = await Disponibilite.findByIdAndUpdate(
                    disponibiliteId,
                    {
                        $set: {
                            confirmation: !!confirmation, // bool
                            canceled: !!canceled,         // bool
                            seen: !!seen,                 // bool
                        },
                        $unset: { presence: "" },
                    },
                    { new: true, runValidators: true }
                );

                if (!updatedDispo) return null;

                // 🔔 Notification push (si token dispo)
                const employee = await Employe.findById(employeeId).select('role expoPushToken');
                if (employee?.expoPushToken) {
                    let screen = '';
                    if (employee.role === 'manager') {
                        screen = '(manager)/(tabs)/(Dispatcher)/Confirmation';
                    } else if (employee.role === 'driver') {
                        screen = '(driver)/(tabs)/(Employe)/AcceuilEmployee';
                    }

                    // Message simple et clair (tu peux l’ajuster si tu veux différencier annulé vs re-confirmation)
                    const statusMessage = `🚨 Urgent: Verify your shift for ${updatedDispo.selectedDay}.`
                        
                    await sendPushNotification(employee.expoPushToken, statusMessage, screen);
                }

                return updatedDispo;
            } catch (err) {
                console.error('Erreur update dispo:', err);
                return null;
            }
        });

        const updatedDisponibilites = (await Promise.all(updatePromises)).filter(Boolean);

        return res.status(200).json({
            message: 'Disponibilites updated successfully',
            updatedDisponibilites,
        });
    } catch (err) {
        return res.status(500).json({
            error: 'Erreur lors de la mise à jour des disponibilités.',
            details: err.message,
        });
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
            publish: true,
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


