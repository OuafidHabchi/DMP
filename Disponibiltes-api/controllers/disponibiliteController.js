const { sendPushNotification } = require('../../utils/notifications'); // Importer ta fonction d'envoi de notifications

// Créer une disponibilité
exports.createDisponibilite = async (req, res) => {
    const { employeeId, selectedDay, shiftId, expoPushToken } = req.body;
    const decisions = "pending";

    try {
        const Disponibilite = req.connection.models.Disponibilite;

        if (!Disponibilite) {
            return res.status(500).json({ error: 'Le modèle Disponibilite n\'est pas disponible dans la connexion actuelle.' });
        }

        const newDisponibilite = new Disponibilite({ employeeId, selectedDay, shiftId, decisions, expoPushToken });
        await newDisponibilite.save();

        res.status(200).json(newDisponibilite);

        if (expoPushToken) {
            sendPushNotification(
                expoPushToken,
                `A new availability has been created for you on ${selectedDay}. Please review it.`
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

        if (!Disponibilite) {
            return res.status(500).json({ error: 'Le modèle Disponibilite n\'est pas disponible dans la connexion actuelle.' });
        }

        const deletedDisponibilite = await Disponibilite.findByIdAndDelete(req.params.id);

        res.status(200).json({ message: deletedDisponibilite ? 'Disponibilite deleted successfully.' : 'Aucune disponibilité à supprimer.' });

        if (deletedDisponibilite?.expoPushToken) {
            sendPushNotification(
                deletedDisponibilite.expoPushToken,
                `Your availability on ${deletedDisponibilite.selectedDay} has been deleted.`
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

        if (!Disponibilite) {
            return res.status(500).json({ error: 'Le modèle Disponibilite n\'est pas disponible dans la connexion actuelle.' });
        }

        const deletedDisponibilites = await Disponibilite.deleteMany({ shiftId });

        res.status(200).json({
            message: deletedDisponibilites.deletedCount
                ? `${deletedDisponibilites.deletedCount} disponibilités supprimées avec succès.`
                : 'Aucune disponibilité trouvée avec cet shiftId.'
        });

        const disponibilites = await Disponibilite.find({ shiftId });

        disponibilites.forEach((disponibilite) => {
            if (disponibilite.expoPushToken) {
                sendPushNotification(
                    disponibilite.expoPushToken,
                    `Your availability on ${disponibilite.selectedDay} has been deleted.`
                ).catch((notificationError) => {
                    console.error('Erreur lors de l\'envoi de la notification push:', notificationError);
                });
            }
        });

    } catch (err) {
        res.status(500).json({ error: 'Erreur lors de la suppression des disponibilités.', details: err.message });
    }
};





// Mettre à jour plusieurs disponibilités
exports.updateMultipleDisponibilites = async (req, res) => {
    const { decisions } = req.body; // Tableau de décisions avec employeeId, selectedDay, shiftId, et status
    try {
        const Disponibilite = req.connection.models.Disponibilite;

        if (!Disponibilite) {
            return res.status(500).json({ error: 'Le modèle Disponibilite n\'est pas disponible dans la connexion actuelle.' });
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

            if (updatedDisponibilite?.expoPushToken) {
                sendPushNotification(
                    updatedDisponibilite.expoPushToken,
                    `Your availability for ${updatedDisponibilite.selectedDay} has been updated with the status: ${decision.status}.`
                ).catch((notificationError) => {
                    console.error('Erreur lors de l\'envoi de la notification push:', notificationError);
                });
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

        if (!Disponibilite) {
            return res.status(500).json({ error: 'Le modèle Disponibilite n\'est pas disponible dans la connexion actuelle.' });
        }

        const updatePromises = confirmations.map(async (confirmation) => {
            try {
                // 🔥 Vérifier si presence existe dans la DB pour cette disponibilité
                const dispo = await Disponibilite.findOne({
                    employeeId: confirmation.employeeId,
                    selectedDay: confirmation.selectedDay,
                    shiftId: confirmation.shiftId
                });

                // 🔥 Si presence existe, on le supprime de la DB
                if (dispo && 'presence' in dispo) {
                    await Disponibilite.updateOne(
                        {
                            employeeId: confirmation.employeeId,
                            selectedDay: confirmation.selectedDay,
                            shiftId: confirmation.shiftId
                        },
                        { $unset: { presence: "" } } // 🔥 Supprimer presence
                    );
                }

                // 🔥 Faire ensuite l'update pour confirmation et seen
                return await Disponibilite.findOneAndUpdate(
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

            } catch (err) {
                console.error('Erreur lors de la vérification et mise à jour:', err);
                return null;
            }
        });

        const updatedDisponibilites = (await Promise.all(updatePromises)).filter(dispo => dispo !== null);

        res.status(200).json({ message: 'Disponibilites updated successfully', updatedDisponibilites });


        updatedDisponibilites.forEach((disponibilite) => {
            if (disponibilite?.expoPushToken) {
                // 🔥 Message personnalisé avec la date et urgence
                const statusMessage = `⚠️ The dispo (${disponibilite.selectedDay}) needs your immediate attention. Check your homepage NOW!`;

                sendPushNotification(disponibilite.expoPushToken, statusMessage).catch((notificationError) => {
                    console.error('Erreur lors de l\'envoi de la notification push:', notificationError);
                });
            }
        });

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
            // 🔥 Dynamically require and initialize the Employee model
            const employeeSchema = require('../../Employes-api/models/Employee'); // Adjust the path if necessary
            Employee = req.connection.model('Employee', employeeSchema);
        }

        // 🔥 Update the presence in the database
        const disponibilite = await Disponibilite.findByIdAndUpdate(
            req.params.id,
            { presence },
            { new: true, runValidators: true }
        );

        // ✅ Manually fetch employee details
        const employee = await Employee.findOne({ _id: disponibilite.employeeId }).select('name familyName');

        // ✅ Emit real-time update via Socket.IO
        const io = req.app.get('socketio');
        io.emit('presenceUpdated', {
            disponibiliteId: disponibilite._id,
            presence: disponibilite.presence
        });

        // ✅ 🔥 Check if presence is NOT confirmed
        if (disponibilite.presence !== 'confirmed') {

            // 🔥 Fetch managers from the Employee collection
            const managers = await Employee.find({ role: 'manager' }).select('expoPushToken');

            // ✅ Send notifications to all managers with expoPushToken
            for (const manager of managers) {
                if (manager.expoPushToken) {
                    const notificationBody = `${employee?.name} ${employee?.familyName} has declined to work on ${disponibilite.selectedDay}.`;
                    await sendPushNotification(manager.expoPushToken, notificationBody);
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

        if (!Disponibilite) {
            return res.status(500).json({
                message: 'Disponibilite model is not available in the current connection.',
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

        res.status(200).json(disponibilitesFiltrees);
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
