// Créer un commentaire
exports.createComment = async (req, res) => {
    try {
        const { idEmploye, date, comment } = req.body;
        const Comment = req.connection.models.Comment;
        const newComment = new Comment({ idEmploye, date, comment });
        await newComment.save();
        res.status(200).json({ message: 'Comment created successfully', newComment });
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la création du commentaire.', details: error.message });
    }
};

// Récupérer tous les commentaires
exports.getAllComments = async (req, res) => {
    try {
        const Comment = req.connection.models.Comment;
        const comments = await Comment.find() || [];
        res.status(200).json(comments);
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la récupération des commentaires.', details: error.message });
    }
};

// Récupérer un commentaire par ID d'employé
exports.getCommentsByEmployeId = async (req, res) => {
    try {
        const Comment = req.connection.models.Comment;
        const comments = await Comment.find({ idEmploye: req.params.idEmploye });
        res.status(200).json(comments.length ? comments : []); // Retourne un tableau vide si aucun commentaire
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la récupération des commentaires.', details: error.message });
    }
};

// Mettre à jour un commentaire par ID
exports.updateComment = async (req, res) => {
    try {
        const Comment = req.connection.models.Comment;
        const { date, comment } = req.body;
        const updatedComment = await Comment.findOneAndUpdate(
            { _id: req.params.id },
            { date, comment },
            { new: true }
        );
        res.status(200).json(updatedComment || {}); // Retourne un objet vide si non trouvé
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la mise à jour du commentaire.', details: error.message });
    }
};

// Supprimer un commentaire par ID
exports.deleteComment = async (req, res) => {
    try {
        const Comment = req.connection.models.Comment;
        const deletedComment = await Comment.findOneAndDelete({ _id: req.params.id });
        res.status(200).json({ message: deletedComment ? 'Comment deleted successfully' : 'Aucun commentaire à supprimer.' });
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la suppression du commentaire.', details: error.message });
    }
};

// Récupérer les commentaires par date
exports.getCommentsByDate = async (req, res) => {
    try {
        const Comment = req.connection.models.Comment;
        const { date } = req.params;
        const comments = await Comment.find({ date });
        res.status(200).json(comments.length ? comments : []); // Retourne un tableau vide si aucun commentaire
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la récupération des commentaires.', details: error.message });
    }
};
