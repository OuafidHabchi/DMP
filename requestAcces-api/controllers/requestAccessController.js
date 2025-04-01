// src/controllers/requestAccessController.js
const SibApiV3Sdk = require('sib-api-v3-sdk');

// Créer une nouvelle demande d'accès
exports.createRequestAccess = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      dspName,
      dspShortCode,
      stationCode,
      stationAddress,
      heardAboutUs,
      heardAboutUsDSP,
    } = req.body;
    const RequestAccess = req.connection.models.RequestAccess;

    if (!RequestAccess) {
      console.error('Le modèle RequestAccess n\'est pas disponible dans la connexion actuelle.');
      return res.status(500).json({ error: 'Le modèle RequestAccess n\'est pas disponible dans la connexion actuelle.' });
    }
    // Créer une nouvelle instance de RequestAccess
    const newRequestAccess = new RequestAccess({
      firstName,
      lastName,
      email,
      dspName,
      dspShortCode: heardAboutUs === 'Referred by DSP' ? dspShortCode : null,
      stationCode,
      stationAddress,
      heardAboutUs,
      heardAboutUsDSP: heardAboutUs === 'Referred by DSP' ? heardAboutUsDSP : null,
    });

  
    await newRequestAccess.save();
    // Configurer l'API client Brevo
    var defaultClient = SibApiV3Sdk.ApiClient.instance;
    var apiKey = defaultClient.authentications['api-key'];
    apiKey.apiKey = process.env.BREVO_API_KEY;
    // Créer l'email
    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

    // Expéditeur
    sendSmtpEmail.sender = { "name": "OPEX LOGISTIX TEAM", "email": "opexlogistix@gmail.com" };

    // Destinataire fixe
    sendSmtpEmail.to = [{ "email": "habchi.ouafid@gmail.com", "name": "Ouafid Habchi" }];

    // Sujet de l'e-mail
    sendSmtpEmail.subject = `Nouvelle demande d'accès reçue de ${firstName} ${lastName}`;

    // Contenu HTML de l'e-mail
    sendSmtpEmail.htmlContent = `
    <h3>Nouvelle demande d'accès reçue :</h3>
    <p><strong>Nom complet :</strong> ${firstName} ${lastName}</p>
    <p><strong>Email de l'utilisateur :</strong> ${email}</p>
    <p><strong>Nom du DSP :</strong> ${dspName}</p>
    ${dspShortCode ? `<p><strong>Code court du DSP :</strong> ${dspShortCode}</p>` : ''}
    <p><strong>Code de la station :</strong> ${stationCode}</p>
    <p><strong>Adresse de la station :</strong> ${stationAddress}</p>
    <p><strong>Comment avez-vous entendu parler de nous ? :</strong> ${heardAboutUs}</p>
    ${heardAboutUsDSP ? `<p><strong>DSP référent :</strong> ${heardAboutUsDSP}</p>` : ''}
    <hr>
    <p>Cet email a été envoyé automatiquement depuis le système de OPEX LOGISTIX.</p>
    `;

    await apiInstance.sendTransacEmail(sendSmtpEmail);
    // Réponse au client
    res.status(200).json({
      success: true,
      message: 'Request access created successfully!',
      data: newRequestAccess,
    });
  } catch (error) {
    // Log de l'erreur
    console.error('Erreur lors de la création de la demande d\'accès:', error);

    res.status(500).json({
      success: false,
      message: 'Error creating request access',
      error: error.message,
    });
  }
};



// Récupérer toutes les demandes d'accès
exports.getAllRequests = async (req, res) => {
  try {
    const RequestAccess = req.connection.models.RequestAccess;

    if (!RequestAccess) {
      return res.status(500).json({
        success: false,
        message: 'Le modèle RequestAccess n\'est pas disponible dans la connexion actuelle.',
      });
    }

    // Récupérer toutes les demandes d'accès
    const requests = await RequestAccess.find();

    res.status(200).json({
      success: true,
      message: 'Requests retrieved successfully!',
      data: requests,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving requests',
      error: error.message,
    });
  }
};
