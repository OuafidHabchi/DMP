// controllers/trainingController.js
const { Types } = require('mongoose');
const { uploadMulterFiles, deleteByUrls } = require('../../utils/storage/uploader');

// helpers
const parseMaybeJSON = (v, fb) => {
  if (v === undefined || v === null) return fb;
  if (Array.isArray(v) || typeof v === 'object') return v;
  try { return JSON.parse(v); } catch { return fb; }
};
const toArray = (v) => {
  if (v === undefined || v === null) return [];
  if (Array.isArray(v)) return v;
  return String(v).split(',').map(s => s.trim()).filter(Boolean);
};

// =============== CREATE TRAINING ===============
exports.addTraining = async (req, res) => {
  try {
    const Training = req.connection.models.Training;

    const {
      candidateId, fullName, email, phone,
      createdBy,
      docMeta,
      initialDay
    } = req.body;

    if (!candidateId || !fullName) {
      return res.status(400).json({
        message: 'Champs requis manquants',
        details: { candidateId: !candidateId, fullName: !fullName },
      });
    }

    const training = await Training.create({
      candidateId,
      fullName, email, phone,
      documents: [],
      days: [],
      createdBy: createdBy || null,
    });

    // (1) Upload & ajout de documents (optionnel)
    if (req.files && req.files.length > 0) {
      let meta = parseMaybeJSON(docMeta, null);
      if (!Array.isArray(meta)) {
        meta = toArray(docMeta).map((t) => ({ type: 'Document', title: t }));
      }

      if (meta.length !== req.files.length) {
        return res.status(400).json({ message: 'docMeta doit avoir la même longueur que files' });
      }

      const uploaded = await uploadMulterFiles(req.files, { pathPrefix: `trainings/${training._id}` });

      training.documents.push(
        ...uploaded.map((f, i) => ({
          type: meta[i]?.type || 'Document',
          title: meta[i]?.title || f.fileName,
          url: f.url,
        }))
      );

      await training.save();
    }

    // (2) Créer le Day 1 si fourni
    const day = parseMaybeJSON(initialDay, null);
    if (day) {
      training.days.push({
        dayIndex: 1,
        times: {
          startAt: day?.times?.startAt || null,
          breaks: Array.isArray(day?.times?.breaks) ? day.times.breaks : [],
          endAt: day?.times?.endAt || null,
        },
        mentorId: day?.mentorId || null,
        notes: day?.notes || '',
        result: ['unset', 'pass', 'fail'].includes(day?.result) ? day.result : 'unset',
      });

      await training.save();
    }
    res.status(200).json({ message: 'Training créé', training });

  } catch (err) {
    res.status(500).json({ message: 'Erreur création training', error: err.message });
  }
};

// =============== LIST ===============
exports.getAllTrainings = async (req, res) => {
  try {
    const Training = req.connection.models.Training;
    const { q } = req.query;

    const filter = {};
    if (q) {
      const rgx = new RegExp(String(q).trim(), 'i');
      filter.$or = [{ fullName: rgx }, { email: rgx }, { phone: rgx }];
    }

    const list = await Training.find(filter).sort({ createdAt: -1 }).lean();

    // dayCount dérivé
    const data = list.map(t => ({ ...t, dayCount: (t.days || []).length }));

    res.status(200).json({ data });
  } catch (err) {
    console.error('getAllTrainings error:', err);
    res.status(500).json({ message: 'Erreur liste trainings', error: err.message });
  }
};

// =============== DETAIL ===============
exports.getTrainingById = async (req, res) => {
  try {
    const Training = req.connection.models.Training;
    const training = await Training.findById(req.params.id).lean();
    if (!training) return res.status(404).json({ message: 'Training introuvable' });
    res.status(200).json({ training });
  } catch (err) {
    console.error('getTrainingById error:', err);
    res.status(500).json({ message: 'Erreur détail training', error: err.message });
  }
};

// =============== UPDATE (base + docs add/remove) ===============
exports.updateTrainingById = async (req, res) => {
  try {
    const Training = req.connection.models.Training;
    const training = await Training.findById(req.params.id);
    if (!training) return res.status(404).json({ message: 'Training introuvable' });

    const {
      fullName, email, phone,
      // suppression docs
      deleteDocumentIds, // array | csv | json
      // ajout docs
      docMeta, // array/json/csv de labels {type,title} — même longueur que files
    } = req.body;

    if (fullName !== undefined) training.fullName = fullName;
    if (email !== undefined) training.email = email;
    if (phone !== undefined) training.phone = phone;

    // (1) supprimer des documents
    let delIds = [];
    if (deleteDocumentIds) {
      try { delIds = Array.isArray(deleteDocumentIds) ? deleteDocumentIds : JSON.parse(deleteDocumentIds); }
      catch { delIds = toArray(deleteDocumentIds); }
    }
    if (delIds.length > 0) {
      const toDel = new Set(delIds.map(String));
      const docsToDelete = (training.documents || []).filter(d => toDel.has(String(d._id)));
      const urls = docsToDelete.map(d => d.url).filter(Boolean);
      if (urls.length > 0) {
        try { await deleteByUrls(urls); } catch (e) { console.warn('[updateTraining] deleteByUrls', e?.message || e); }
      }
      training.documents = (training.documents || []).filter(d => !toDel.has(String(d._id)));
    }

    // (2) ajouter des documents (multipart)
    if (req.files && req.files.length > 0) {
      let meta = parseMaybeJSON(docMeta, null);
      if (!Array.isArray(meta)) meta = toArray(docMeta).map((t) => ({ type: 'Document', title: t }));
      if (meta.length !== req.files.length) {
        return res.status(400).json({ message: 'docMeta doit correspondre aux fichiers' });
      }
      const uploaded = await uploadMulterFiles(req.files, { pathPrefix: `trainings/${training._id}` });
      training.documents.push(
        ...uploaded.map((f, i) => ({
          type: meta[i]?.type || 'Document',
          title: meta[i]?.title || f.fileName,
          url: f.url,
        }))
      );
    }

    const updated = await training.save();
    res.status(200).json({ message: 'Training mis à jour', training: updated });
  } catch (err) {
    console.error('updateTrainingById error:', err);
    res.status(500).json({ message: 'Erreur update training', error: err.message });
  }
};

// =============== DELETE TRAINING (et fichiers) ===============
exports.deleteTrainingById = async (req, res) => {
  try {
    const Training = req.connection.models.Training;
    const training = await Training.findById(req.params.id);
    if (!training) return res.status(404).json({ message: 'Training introuvable' });

    // Supprimer fichiers côté Spaces (par URL)
    const urls = (training.documents || []).map(d => d.url).filter(Boolean);
    if (urls.length > 0) {
      try { await deleteByUrls(urls); } catch (e) { console.warn('[deleteTraining] deleteByUrls', e?.message || e); }
    }

    await Training.findByIdAndDelete(training._id);
    res.status(200).json({ message: 'Training supprimé' });
  } catch (err) {
    console.error('deleteTrainingById error:', err);
    res.status(500).json({ message: 'Erreur suppression training', error: err.message });
  }
};

// ========================= DAYS (embarqués) =========================

// Ajouter un jour (J+1 automatique)
exports.addDay = async (req, res) => {
  try {
    const Training = req.connection.models.Training;
    const training = await Training.findById(req.params.id);
    if (!training) return res.status(404).json({ message: 'Training introuvable' });

    const payload = parseMaybeJSON(req.body.day, req.body);
    const nextIndex = (training.days?.length || 0) + 1;

    training.days.push({
      dayIndex: nextIndex,
      times: {
        startAt: payload?.times?.startAt || null,
        breaks: Array.isArray(payload?.times?.breaks) ? payload.times.breaks : [],
        endAt: payload?.times?.endAt || null,
      },
      notes: payload?.notes || '',
      result: ['unset', 'pass', 'fail'].includes(payload?.result) ? payload.result : 'unset',
    });

    await training.save();
    const day = training.days[training.days.length - 1];
    res.status(200).json({ message: 'Jour ajouté', day });
  } catch (err) {
    console.error('addDay error:', err);
    res.status(500).json({ message: 'Erreur ajout jour', error: err.message });
  }
};

// MAJ d’un jour
exports.updateDayById = async (req, res) => {
  try {
    const Training = req.connection.models.Training;
    const training = await Training.findById(req.params.id);
    if (!training) return res.status(404).json({ message: 'Training introuvable' });

    const day = training.days.id(req.params.dayId);
    if (!day) return res.status(404).json({ message: 'Jour introuvable' });

    const { times, mentorId, notes } = parseMaybeJSON(req.body.day, req.body);

    if (times !== undefined) {
      if (times.startAt !== undefined) day.times.startAt = times.startAt || null;
      if (times.endAt !== undefined) day.times.endAt = times.endAt || null;
      if (Array.isArray(times.breaks)) day.times.breaks = times.breaks;
    }
    if (notes !== undefined) day.notes = notes;

    await training.save();
    res.status(200).json({ message: 'Jour mis à jour', day });
  } catch (err) {
    console.error('updateDayById error:', err);
    res.status(500).json({ message: 'Erreur update jour', error: err.message });
  }
};

// Pass/Fail/Unset d’un jour
exports.setDayResult = async (req, res) => {
  try {
    const Training = req.connection.models.Training;
    const training = await Training.findById(req.params.id);
    if (!training) return res.status(404).json({ message: 'Training introuvable' });

    const day = training.days.id(req.params.dayId);
    if (!day) return res.status(404).json({ message: 'Jour introuvable' });

    const { result } = req.body;
    if (!['pass', 'fail', 'unset'].includes(result)) {
      return res.status(400).json({ message: 'result invalide' });
    }

    day.result = result;
    await training.save();

    res.status(200).json({ message: 'Résultat mis à jour', day });
  } catch (err) {
    console.error('setDayResult error:', err);
    res.status(500).json({ message: 'Erreur MAJ résultat', error: err.message });
  }
};

// Supprimer un jour et réindexer
exports.deleteDayById = async (req, res) => {
  try {
    const Training = req.connection.models.Training;
    const training = await Training.findById(req.params.id);
    if (!training) return res.status(404).json({ message: 'Training introuvable' });

    const dayId = String(req.params.dayId);

    // Vérifier que le jour existe
    const exists = (training.days || []).some(d => String(d._id) === dayId);
    if (!exists) return res.status(404).json({ message: 'Jour introuvable' });

    // ➜ Au lieu de day.remove(), on filtre puis on réindexe
    training.days = (training.days || []).filter(d => String(d._id) !== dayId);
    training.days.forEach((d, i) => { d.dayIndex = i + 1; });

    await training.save();
    res.status(200).json({ message: 'Jour supprimé' });
  } catch (err) {
    console.error('deleteDayById error:', err);
    res.status(500).json({ message: 'Erreur suppression jour', error: err.message });
  }
};

// ====================== DOCUMENTS ======================

// Ajouter des documents (name/type + upload → url)
exports.addDocuments = async (req, res) => {
  try {
    const Training = req.connection.models.Training;
    const training = await Training.findById(req.params.id);
    if (!training) return res.status(404).json({ message: 'Training introuvable' });

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'Aucun fichier' });
    }

    // docMeta = [{ type, title }, ...] ou CSV/array simple
    let meta = parseMaybeJSON(req.body.docMeta, null);
    if (!Array.isArray(meta)) meta = toArray(req.body.docMeta).map((t) => ({ type: 'Document', title: t }));
    if (meta.length !== req.files.length) {
      return res.status(400).json({ message: 'docMeta doit correspondre aux fichiers' });
    }

    const uploaded = await uploadMulterFiles(req.files, { pathPrefix: `trainings/${training._id}` });

    training.documents.push(
      ...uploaded.map((f, i) => ({
        type: meta[i]?.type || 'Document',
        title: meta[i]?.title || f.fileName,
        url: f.url,
      }))
    );

    await training.save();
    res.status(200).json({ message: 'Documents ajoutés', documents: training.documents });
  } catch (err) {
    console.error('addDocuments error:', err);
    res.status(500).json({ message: 'Erreur ajout documents', error: err.message });
  }
};

// Supprimer un document (et l’objet Spaces lié)
exports.deleteDocument = async (req, res) => {
  try {
    const Training = req.connection.models.Training;
    const training = await Training.findById(req.params.id);
    if (!training) return res.status(404).json({ message: 'Training introuvable' });

    const doc = (training.documents || []).find(d => String(d._id) === String(req.params.docId));
    if (!doc) return res.status(404).json({ message: 'Document introuvable' });

    try { await deleteByUrls([doc.url]); }
    catch (e) { console.warn('[deleteDocument] deleteByUrls', e?.message || e); }

    training.documents = (training.documents || []).filter(d => String(d._id) !== String(req.params.docId));
    await training.save();

    res.status(200).json({ message: 'Document supprimé' });
  } catch (err) {
    console.error('deleteDocument error:', err);
    res.status(500).json({ message: 'Erreur suppression document', error: err.message });
  }
};
