const { sendPushNotification } = require('../../utils/notifications');
const { uploadMulterFiles, deleteByUrls } = require('../../utils/storage/uploader');

/** ✅ NEW: Upload MULTI depuis req.files OU req.body.images (array de DataURL/base64/URL) */
async function resolveAndUploadImages(req, pathPrefixBase = 'violations') {
    const outUrls = [];

    // 1) multipart: req.files (acceptés via upload.any()) — peut contenir 'images' *et/ou* 'file'
    const files = Array.isArray(req.files) ? req.files : (req.file ? [req.file] : []);
    if (files && files.length) {
        const uploaded = await uploadMulterFiles(files, { pathPrefix: `${pathPrefixBase}/${Date.now()}` });
        for (const u of uploaded || []) {
            if (u?.url) outUrls.push(u.url);
        }
    }

    // 2) body.images: array de sources (DataURL/base64/URL)
    //    body.image: source unique (DataURL/base64/URL) -> compat existant
    const bodyImages = [];
    if (Array.isArray(req.body?.images)) bodyImages.push(...req.body.images);
    if (req.body?.image) bodyImages.push(req.body.image);

    for (let i = 0; i < bodyImages.length; i++) {
        const src = String(bodyImages[i] || '');

        // 2a) Si c’est déjà une URL http(s), on l’accepte telle quelle (cas cloudifié en amont)
        if (/^https?:\/\//i.test(src)) {
            outUrls.push(src);
            continue;
        }

        // 2b) DataURL → pseudo file → upload
        if (src.startsWith('data:')) {
            const pseudo = buildPseudoMulterFileFromDataUrl(src, req.body?.imageName || `image_${i}.png`);
            if (pseudo) {
                const uploaded = await uploadMulterFiles([pseudo], { pathPrefix: `${pathPrefixBase}/${Date.now()}` });
                if (uploaded?.[0]?.url) outUrls.push(uploaded[0].url);
            }
            continue;
        }

        // 2c) base64 "nu"
        if (/^[A-Za-z0-9+/=]+$/.test(src)) {
            const pseudo = buildPseudoMulterFileFromBase64(src, req.body?.imageMime || 'image/jpeg', req.body?.imageName || `image_${i}.jpg`);
            if (pseudo) {
                const uploaded = await uploadMulterFiles([pseudo], { pathPrefix: `${pathPrefixBase}/${Date.now()}` });
                if (uploaded?.[0]?.url) outUrls.push(uploaded[0].url);
            }
            continue;
        }

        // Sinon: ignoré
    }

    return outUrls;
}


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
            employeeId,
            type,
            createdBy,
            date,
            link,
            description,
            seen,
            dsp_code,
            expoPushToken,
        } = req.body || {};

        if (!employeeId || !type || !createdBy || !date) {
            return res.status(400).json({ error: 'employeeId, type, createdBy and date are required.' });
        }

        const isTruthy = (v) => v === true || v === 'true' || v === 1 || v === '1';

        // 🔹 Upload multi-images (multipart ou body.images / body.image)
        let photos = [];
        try {
            photos = await resolveAndUploadImages(req, `dailyViolations/${employeeId}`);
        } catch (e) {
            console.error('[createViolation] Images upload failed:', e?.message);
            // on continue même si l’upload échoue
        }

        // 🔹 Payload principal
        const payload = {
            employeeId,
            type,
            link: link || '',
            description: description || '',
            createdBy,
            date,
            seen: typeof seen !== 'undefined' ? isTruthy(seen) : false,
        };

        // 🔹 Multi-images + compat 'photo'
        if (photos.length) {
            payload.photos = photos;
            payload.photo = photos[0]; // cover legacy
        }

        // Compat si le front a déjà poussé une URL 'photo'
        if (req.body.photo) {
            payload.photo = req.body.photo;
            // s’assurer que photo figure aussi dans photos[] en tête
            payload.photos = payload.photos?.length
                ? [req.body.photo, ...payload.photos.filter((u) => String(u) !== String(req.body.photo))]
                : [req.body.photo];
        }

        // dsp_code (si présent dans ton schema)
        if (typeof dsp_code !== 'undefined') payload.dsp_code = dsp_code;

        // 🔹 Création
        const violation = await DailyViolation.create(payload);

        // 🔹 Réponse immédiate
        res.status(200).json(violation);

        // 🔹 Notification (best-effort, async)
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


// Mettre à jour une violation (multi-images: append / suppression ciblée / remplacement complet)
exports.updateViolation = async (req, res) => {
    try {
        const DailyViolation = req.connection.models.DailyViolation;
        const violation = await DailyViolation.findById(req.params.id);
        if (!violation) return res.status(404).json({ error: 'Violation not found' });

        const isTruthy = (v) => v === true || v === 'true' || v === 1 || v === '1';

        // ✅ Normaliser l’état actuel (compat legacy)
        violation.photos = Array.isArray(violation.photos)
            ? violation.photos
            : (violation.photo ? [violation.photo] : []);

        // ✅ Intentions côté body
        const replacePhotos = isTruthy(req.body?.replacePhotos); // si true => on remplace l'ensemble
        const removeImageUrls = Array.isArray(req.body?.removeImageUrls)
            ? req.body.removeImageUrls.map(String)
            : [];

        // ✅ Uploader d’éventuelles nouvelles images (multipart ou body.images/image)
        let newlyUploaded = [];
        try {
            newlyUploaded = await resolveAndUploadImages(req, `dailyViolations/${violation.employeeId}`);
        } catch (e) {
            console.error('[updateViolation] Images upload failed:', e?.message);
        }

        // ✅ Suppression ciblée d’URLs demandées
        if (removeImageUrls.length) {
            try { await deleteByUrls(removeImageUrls); } catch (_) { }
            violation.photos = (violation.photos || []).filter(
                (u) => !removeImageUrls.includes(String(u))
            );
            // si la cover 'photo' est supprimée, on la recalculera plus bas
            if (violation.photo && removeImageUrls.includes(String(violation.photo))) {
                violation.photo = undefined;
            }
        }

        // ✅ Remplacement complet si demandé
        if (replacePhotos) {
            try { await deleteByUrls(violation.photos || []); } catch (_) { }
            violation.photos = [];
            violation.photo = undefined;
        }

        // ✅ Ajout des nouvelles images (append)
        if (newlyUploaded.length) {
            violation.photos = [...(violation.photos || []), ...newlyUploaded];
        }

        // ✅ Compat: removeImage (legacy) => supprime la cover unique et son entrée dans photos[]
        if (isTruthy(req.body?.removeImage)) {
            if (violation.photo) {
                try { await deleteByUrls([violation.photo]); } catch (_) { }
                violation.photos = (violation.photos || []).filter(
                    (u) => String(u) !== String(violation.photo)
                );
                violation.photo = undefined;
            }
        }

        // ✅ Forcer/effacer la cover via body.photo
        if (typeof req.body.photo !== 'undefined') {
            if (req.body.photo) {
                // impose une cover donnée (URL)
                violation.photo = req.body.photo;
                if (!(violation.photos || []).includes(req.body.photo)) {
                    violation.photos = [req.body.photo, ...(violation.photos || [])];
                }
            } else {
                // string vide => effacer la cover
                if (violation.photo) {
                    try { await deleteByUrls([violation.photo]); } catch (_) { }
                    violation.photos = (violation.photos || []).filter(
                        (u) => String(u) !== String(violation.photo)
                    );
                    violation.photo = undefined;
                }
            }
        }

        // ✅ Si on n’a pas de cover mais on a des photos, définir la première comme cover
        if (!violation.photo && violation.photos && violation.photos.length) {
            violation.photo = violation.photos[0];
        }

        // 🔹 Mettre à jour les autres champs
        const updatable = ['type', 'link', 'description', 'date', 'seen'];
        updatable.forEach((k) => {
            if (typeof req.body[k] !== 'undefined') violation[k] = req.body[k];
        });

        await violation.save();
        return res.status(200).json(violation);
    } catch (err) {
        console.error('updateViolation error:', err);
        return res.status(500).json({
            error: 'Erreur lors de la mise à jour de la violation.',
            details: err.message,
        });
    }
};



// Supprimer une violation (et toutes ses images dans le storage si présentes)
exports.deleteViolation = async (req, res) => {
  try {
    const DailyViolation = req.connection.models.DailyViolation;
    const violation = await DailyViolation.findById(req.params.id);
    if (!violation) {
      return res.status(404).json({ message: 'Violation non trouvée.' });
    }

    // Normaliser l'état multi-images
    const photos = Array.isArray(violation.photos)
      ? violation.photos
      : (violation.photo ? [violation.photo] : []);

    if (photos.length) {
      try { await deleteByUrls(photos); } catch (e) {
        console.warn('[deleteViolation] Failed to delete photos from storage:', e?.message);
      }
    } else if (violation.photo) {
      // (compat si jamais photos[] est vide mais photo existe)
      try { await deleteByUrls([violation.photo]); } catch (e) {
        console.warn('[deleteViolation] Failed to delete photo from storage:', e?.message);
      }
    }

    await violation.deleteOne();
    return res.status(200).json({ message: 'Violation deleted successfully' });
  } catch (err) {
    return res.status(500).json({
      error: 'Erreur lors de la suppression de la violation.',
      details: err.message,
    });
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
