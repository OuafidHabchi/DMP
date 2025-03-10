const { sendPushNotification } = require('../../utils/notifications');

exports.createEvent = async (req, res) => {
    try {
        const Event = req.connection.models.Event;
        const Employee = req.connection.models.Employee;
        // Create the event
        const event = new Event(req.body);
        const savedEvent = await event.save();

        // Retrieve the event creator
        const creator = await Employee.findById(savedEvent.createdBy);
        if (!creator) {
            console.log("⚠️ Creator not found:", savedEvent.createdBy);
        }
        const creatorName = creator ? `${creator.name} ${creator.familyName}` : "Unknown";

        // Retrieve invited guests
        const invitedIds = savedEvent.invitedGuests;
        const invitedEmployees = await Employee.find({ _id: { $in: invitedIds }, expoPushToken: { $exists: true } });


        // Send notifications to invited guests
        const tokens = invitedEmployees.map(emp => emp.expoPushToken);

        if (tokens.length > 0) {
            const message = `You are invited to a meeting created by ${creatorName} on ${savedEvent.date} at ${savedEvent.heur}.`;
            for (const token of tokens) {
                console.log("📤 Sending notification to:", token);
                await sendPushNotification(token, message);
            }
        } else {
            console.log("🚫 No tokens available, no notifications sent.");
        }

        res.status(200).json(savedEvent);
    } catch (error) {
        console.error("❌ Error creating event:", error);
        res.status(500).json({ message: error.message });
    }
};



// Obtenir tous les événements
exports.getEvents = async (req, res) => {
    try {
        const Event = req.connection.models.Event;

        if (!Event) {
            return res.status(500).json({ error: 'Le modèle Event n\'est pas disponible dans la connexion actuelle.' });
        }

        const events = await Event.find() || [];

        res.status(200).json(events);
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la récupération des événements.', details: error.message });
    }
};

// Obtenir un événement par ID
exports.getEventById = async (req, res) => {
    try {
        const Event = req.connection.models.Event;

        if (!Event) {
            return res.status(500).json({ error: 'Le modèle Event n\'est pas disponible dans la connexion actuelle.' });
        }

        const event = await Event.findById(req.params.id);

        res.status(200).json(event || {}); // Retourne un objet vide si non trouvé
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la récupération de l\'événement.', details: error.message });
    }
};


// Mettre à jour un événement
exports.updateEvent = async (req, res) => {
    try {
        const Event = req.connection.models.Event;
        const Employee = req.connection.models.Employee;

        // Récupérer les anciennes données avant la mise à jour
        const oldEvent = await Event.findById(req.params.id);
        if (!oldEvent) return res.status(500).json({ message: 'Event not found' });

        // Mettre à jour l'événement
        const updatedEvent = await Event.findByIdAndUpdate(req.params.id, req.body, { new: true });

        // Récupérer le créateur
        const creator = await Employee.findById(updatedEvent.createdBy);
        const creatorName = creator ? `${creator.name} ${creator.familyName}` : "Unknown";

        // Comparer les anciennes et nouvelles données
        let changes = [];
        if (oldEvent.date !== updatedEvent.date) changes.push(`📅 Date: ${oldEvent.date} → ${updatedEvent.date}`);
        if (oldEvent.heur !== updatedEvent.heur) changes.push(`⏰ Time: ${oldEvent.heur} → ${updatedEvent.heur}`);
        if (oldEvent.duration !== updatedEvent.duration) changes.push(`⌛ Duration: ${oldEvent.duration} → ${updatedEvent.duration}`);
        if (oldEvent.Link !== updatedEvent.Link) changes.push(`🔗 Link: ${oldEvent.Link} → ${updatedEvent.Link}`);

        // Construire le message de notification uniquement si des changements existent
        if (changes.length > 0) {
            const message = `🔄 The meeting created by ${creatorName} has been updated:\n${changes.join('\n')}`;

            // Récupérer les invités
            const invitedIds = updatedEvent.invitedGuests;
            const invitedEmployees = await Employee.find({ _id: { $in: invitedIds }, expoPushToken: { $exists: true } });

            // Envoyer les notifications aux invités
            const tokens = invitedEmployees.map(emp => emp.expoPushToken);
            if (tokens.length > 0) {
                for (const token of tokens) {
                    await sendPushNotification(token, message);
                }
            }
        }

        res.status(200).json(updatedEvent);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};



// Supprimer un événement
exports.deleteEvent = async (req, res) => {
    try {
        const Event = req.connection.models.Event;
        const Employee = req.connection.models.Employee;

        const deletedEvent = await Event.findByIdAndDelete(req.params.id);
        if (!deletedEvent) return res.status(500).json({ message: 'Event not found' });

        // Récupérer le créateur de l'événement
        const creator = await Employee.findById(deletedEvent.createdBy);
        const creatorName = creator ? `${creator.name} ${creator.familyName}` : "Unknown";

        // Récupérer les invités
        const invitedIds = deletedEvent.invitedGuests;
        const invitedEmployees = await Employee.find({ _id: { $in: invitedIds }, expoPushToken: { $exists: true } });

        // Envoyer une notification aux invités
        const tokens = invitedEmployees.map(emp => emp.expoPushToken);
        if (tokens.length > 0) {
            const message = `The meeting created by ${creatorName} on ${deletedEvent.date} at ${deletedEvent.heur} has been cancelled.`;
            for (const token of tokens) {
                await sendPushNotification(token, message);
            }
        }

        res.status(200).json({ message: 'Event deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

