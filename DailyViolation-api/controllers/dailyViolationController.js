const { sendPushNotification } = require('../../utils/notifications');
const { uploadMulterFiles, deleteByUrls } = require('../../utils/storage/uploader');

/** Utilitaires image (DataURL/base64) */
function parseDataUrl(dataUrl) {
  // data:image/png;base64,AAA...
  const m = /^data:([^;]+);base64,(.*)$/i.exec(String(dataUrl || ''));
  if (!m) return null;
  return { mime: m[1], base64: m[2] };
}

function buildPseudoMulterFileFromDataUrl(dataUrl, fallbackName = 'image.png') {
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) return null;
  const buf = Buffer.from(parsed.base64, 'base64');
  return {
    buffer: buf,
    originalname: fallbackName,
    mimetype: parsed.mime || 'application/octet-stream',
    size: buf.length,
    fieldname: 'file',
  };
}

function buildPseudoMulterFileFromBase64(base64, mime = 'image/jpeg', name = 'image.jpg') {
  if (!base64) return null;
  const buf = Buffer.from(String(base64), 'base64');
  return {
    buffer: buf,
    originalname: name,
    mimetype: mime,
    size: buf.length,
    fieldname: 'file',
  };
}

/** Upload image depuis req.files OU req.body.image (DataURL/base64). Retourne url ou null. */
async function resolveAndUploadImage(req, pathPrefixBase = 'violations') {
  // 1) multipart (via maybeMulter)
  const files = Array.isArray(req.files) ? req.files : (req.file ? [req.file] : []);
  if (files && files.length) {
    const uploaded = await uploadMulterFiles(files, { pathPrefix: `${pathPrefixBase}/${Date.now()}` });
    return uploaded?.[0]?.url || null;
  }

  // 2) DataURL (front envoie payload.image = "data:image/png;base64,...")
  if (req.body && req.body.image) {
    let pseudo;
    if (String(req.body.image).startsWith('data:')) {
      pseudo = buildPseudoMulterFileFromDataUrl(
        req.body.image,
        req.body.imageName || 'image.png'
      );
    } else {
      // base64 "nu" + mime optionnel
      pseudo = buildPseudoMulterFileFromBase64(
        req.body.image,
        req.body.imageMime || 'image/jpeg',
        req.body.imageName || 'image.jpg'
      );
    }
    if (pseudo) {
      const uploaded = await uploadMulterFiles([pseudo], { pathPrefix: `${pathPrefixBase}/${Date.now()}` });
      return uploaded?.[0]?.url || null;
    }
  }

  return null;
}

/** =========================
 *         CONTROLLERS
 *  ========================= */

exports.createViolation = async (req, res) => {
  try {
    const DailyViolation = req.connection.models.DailyViolation;
    const Employee = req.connection.models.Employee;

    if (!DailyViolation || !Employee) {
      console.error('[createViolation] Missing models', Object.keys(req.connection.models || {}));
      return res.status(500).json({ error: 'Server models not initialized' });
    }

    const {
      employeeId, type, createdBy, date,
      link, description, seen, dsp_code, expoPushToken,
    } = req.body || {};

    if (!employeeId || !type || !createdBy || !date) {
      return res.status(400).json({ error: 'employeeId, type, createdBy and date are required.' });
    }

    // gérer image (multipart ou dataURL/base64) → photo URL
    let photoUrl = null;
    try {
      photoUrl = await resolveAndUploadImage(req, `dailyViolations/${employeeId}`);
    } catch (e) {
      console.error('[createViolation] Image upload failed:', e?.message);
      // on continue sans bloquer la création si l’image échoue
    }

    const payload = {
      employeeId,
      type,
      link: link || '',
      description: description || '',
      createdBy,
      date,
      seen: typeof seen === 'boolean' ? seen : false,
      photo: photoUrl || req.body.photo || undefined, // si front envoie déjà une URL (rare)
    };

    // dsp_code facultatif si ton schema l’a
    if (typeof dsp_code !== 'undefined') payload.dsp_code = dsp_code;

    const violation = await DailyViolation.create(payload);

    // Réponse immédiate
    res.status(200).json(violation);

    // Notification (async best-effort)
    try {
      if (expoPushToken && employeeId) {
        const employee = await Employee.findById(employeeId).select('role');
        let screen = '';
        if (employee?.role === 'manager') {
          screen = '(manager)/(tabs)/(Dispatcher)/DailyInfractions';
        } else if (employee?.role === 'driver') {
          screen = '(driver)/(tabs)/(Employe)/Violations';
        }
        const notificationBody = `A violation of type ${type || 'Unknown'} has been recorded. Check the details in your app.`;
        await sendPushNotification(expoPushToken, notificationBody, screen);
      }
    } catch (notifyErr) {
      console.error('[createViolation] push notify error:', notifyErr?.message);
    }
  } catch (err) {
    console.error('createViolation error:', err);
    res.status(500).json({
      error: 'Erreur lors de la création de la violation.',
      details: err.message,
    });
  }
};

// Obtenir toutes les violations
exports.getViolations = async (req, res) => {
  try {
    const DailyViolation = req.connection.models.DailyViolation;
    const violations = await DailyViolation.find() || [];
    res.status(200).json(violations);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la récupération des violations.', details: err.message });
  }
};

// Obtenir une violation par ID
exports.getViolationById = async (req, res) => {
  try {
    const DailyViolation = req.connection.models.DailyViolation;
    const violation = await DailyViolation.findById(req.params.id);
    if (!violation) return res.status(404).json({ error: 'Violation not found' });
    res.status(200).json(violation);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la récupération de la violation.', details: err.message });
  }
};


// Mettre à jour une violation (support remplacement image / suppression image)
exports.updateViolation = async (req, res) => {
  try {
    const DailyViolation = req.connection.models.DailyViolation;
    const violation = await DailyViolation.findById(req.params.id);
    if (!violation) return res.status(404).json({ error: 'Violation not found' });

    const isTruthy = (v) => v === true || v === 'true' || v === 1 || v === '1';

    // 1) Tenter un nouvel upload si multipart/dataURL présent
    let newPhotoUrl = null;
    try {
      newPhotoUrl = await resolveAndUploadImage(req, `dailyViolations/${violation.employeeId}`);
    } catch (e) {
      console.error('[updateViolation] Image upload failed:', e?.message);
    }

    // 2) Si nouvel upload => remplacer et supprimer l’ancienne
    if (newPhotoUrl) {
      if (violation.photo) {
        try { await deleteByUrls([violation.photo]); } catch (_) {}
      }
      violation.photo = newPhotoUrl;
    } else {
      // 3) Pas de nouvel upload : gérer les intentions côté body

      // 3a) Suppression explicite via removeImage
      if (isTruthy(req.body?.removeImage)) {
        if (violation.photo) {
          try { await deleteByUrls([violation.photo]); } catch (_) {}
        }
        violation.photo = undefined;
      }

      // 3b) Compat : effacement via photo === '' OU forcer une URL externe
      if (typeof req.body.photo !== 'undefined') {
        if (!req.body.photo) {
          if (violation.photo) {
            try { await deleteByUrls([violation.photo]); } catch (_) {}
          }
          violation.photo = undefined;
        } else {
          violation.photo = req.body.photo;
        }
      }
    }

    // 4) Mettre à jour les autres champs
    const updatable = ['type', 'link', 'description', 'date', 'seen'];
    updatable.forEach((k) => {
      if (typeof req.body[k] !== 'undefined') violation[k] = req.body[k];
    });

    await violation.save();
    res.status(200).json(violation);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la mise à jour de la violation.', details: err.message });
  }
};



// Supprimer une violation (et l’image dans Spaces si présente)
exports.deleteViolation = async (req, res) => {
  try {
    const DailyViolation = req.connection.models.DailyViolation;
    const violation = await DailyViolation.findById(req.params.id);
    if (!violation) {
      return res.status(404).json({ message: 'Violation non trouvée.' });
    }

    if (violation.photo) {
      try { await deleteByUrls([violation.photo]); } catch (e) {
        console.warn('[deleteViolation] Failed to delete photo from storage:', e?.message);
      }
    }

    await violation.deleteOne();
    res.status(200).json({ message: 'Violation deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la suppression de la violation.', details: err.message });
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
    res.status(500).json({ error: 'Erreur lors de la récupération des violations.', details: err.message });
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
      if (!acc[violationDate]) acc[violationDate] = {};
      acc[violationDate][violation.type] = (acc[violationDate][violation.type] || 0) + 1;
      return acc;
    }, {});

    res.status(200).json(groupedData);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la récupération des violations hebdomadaires.', details: err.message });
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
      if (!acc[violationDate]) acc[violationDate] = {};
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

    const DailyViolation = req.connection.models.DailyViolation;
    const query = {
      date: {
        $gte: start.toISOString().split('T')[0],
        $lte: end.toISOString().split('T')[0],
      },
    };
    if (employeeId) query.employeeId = employeeId;

    const violations = await DailyViolation.find(query) || [];

    const groupedData = violations.reduce((acc, violation) => {
      const empId = violation.employeeId;
      const violationDate = violation.date;

      if (!acc[empId]) acc[empId] = {};
      if (!acc[empId][violationDate]) acc[empId][violationDate] = {};

      acc[empId][violationDate][violation.type] =
        (acc[empId][violationDate][violation.type] || 0) + 1;
      return acc;
    }, {});

    res.status(200).json(groupedData);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la récupération des violations hebdomadaires.', details: err.message });
  }
};
