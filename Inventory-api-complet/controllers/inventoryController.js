// Récupérer tous les articles
exports.getAllItems = async (req, res) => {
    try {
        const InventoryItem = req.connection.models.InventoryItem;

        if (!InventoryItem) {
            return res.status(500).json({ error: 'Le modèle InventoryItem n\'est pas disponible dans la connexion actuelle.' });
        }

        const items = await InventoryItem.find() || [];

        res.status(200).json(items);
    } catch (err) {
        res.status(500).json({ error: 'Erreur lors de la récupération des articles.', details: err.message });
    }
};

// Récupérer un article par ID
exports.getItemById = async (req, res) => {
    try {
        const InventoryItem = req.connection.models.InventoryItem;

        if (!InventoryItem) {
            return res.status(500).json({ error: 'Le modèle InventoryItem n\'est pas disponible dans la connexion actuelle.' });
        }

        const item = await InventoryItem.findById(req.params.id);
        
        res.status(200).json(item || {}); // Retourne un objet vide si non trouvé
    } catch (err) {
        res.status(500).json({ error: 'Erreur lors de la récupération de l\'article.', details: err.message });
    }
};


// CREATE multiple items
exports.createItems = async (req, res) => {
    try {
        const InventoryItem = req.connection.models.InventoryItem; // Modèle injecté dynamiquement
        // Normalisation des valeurs de type
        const normalizedItems = req.body.map(item => ({
            ...item,
            type: item.type.charAt(0).toUpperCase() + item.type.slice(1).toLowerCase() // Capitalize the first letter
        }));

        // console.log('Normalized data:', normalizedItems);

        const items = await InventoryItem.insertMany(normalizedItems);
        res.status(200).json({ message: "Items created successfully", items });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};



// UPDATE or CREATE multiple items
exports.updateItems = async (req, res) => {
    try {
        const InventoryItem = req.connection.models.InventoryItem;

        // Normalisation des types
        const normalizedUpdates = req.body.map(item => ({
            ...item,
            type: item.type.charAt(0).toUpperCase() + item.type.slice(1).toLowerCase()
        }));

        const results = await Promise.all(
            normalizedUpdates.map(async (item) => {
                // Vérifie si l'élément existe
                const existingItem = await InventoryItem.findById(item.id);

                if (existingItem) {
                    // Met à jour l'élément existant
                    return await InventoryItem.findByIdAndUpdate(
                        item.id,
                        { $set: item },
                        { new: true }
                    );
                } else {
                    // Crée un nouvel élément
                    const newItemData = { ...item };
                    delete newItemData.id; // On enlève `id` pour éviter les conflits avec _id généré
                    const newItem = new InventoryItem(newItemData);
                    return await newItem.save();
                }
            })
        );

        res.status(200).json({ message: "Items updated or created successfully", results });
    } catch (err) {
        console.error("Error updating or creating items:", err.message);
        res.status(500).json({ error: err.message });
    }
};





// DELETE all items
exports.clearAllItems = async (req, res) => {
    try {
        const InventoryItem = req.connection.models.InventoryItem; // Modèle injecté dynamiquement
        const result = await InventoryItem.deleteMany({});
        res.status(200).json({ message: `All items deleted successfully. Total deleted: ${result.deletedCount}` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
