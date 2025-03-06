// Importer le SDK de Brevo
const SibApiV3Sdk = require('sib-api-v3-sdk');

// Create
exports.addContact = async (req, res) => {
  try {
    const Contact = req.connection.models.Contact;
    const newContact = new Contact(req.body);
    await newContact.save();
    // Configurer l'API client Brevo
    var defaultClient = SibApiV3Sdk.ApiClient.instance;
    var apiKey = defaultClient.authentications['api-key'];
    apiKey.apiKey = process.env.BREVO_API_KEY;

    // Créer l'email
    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

    sendSmtpEmail.sender = { "name": "DMP Management team", "email": "dspmanagementpartenaire@gmail.com" };
    sendSmtpEmail.to = [{ "email": "habchi.ouafid@gmail.com", "name": "Ouafid Habchi" }];
    sendSmtpEmail.subject = `Nouveau message reçu : ${newContact.subject}`;

    // Ajouter le contenu du message dans l'email
    sendSmtpEmail.htmlContent = `
      <h3>Nouveau message reçu :</h3>
      <p><strong>Sujet :</strong> ${newContact.subject}</p>
      <p><strong>DSP Code :</strong> ${newContact.dsp_code}</p>
      <hr>
      <h4>Message :</h4>
      <p>${newContact.message}</p>
      <hr>
      <p>Cet email a été envoyé automatiquement depuis le système de DSP Management.</p>
    `;
    // Envoyer l'email via l'API Brevo
    await apiInstance.sendTransacEmail(sendSmtpEmail);
    res.status(200).json({ message: 'Contact ajouté avec succès et email envoyé', contact: newContact });
  } catch (error) {
    console.error("❌ Erreur lors de l'ajout ou de l'envoi de l'email :", error);
    res.status(500).json({ message: 'Erreur lors de l\'ajout du contact ou de l\'envoi de l\'email', error });
  }
};



// Read All
exports.getAllContacts = async (req, res) => {
  try {
    const Contact = req.connection.models.Contact;
    const contacts = await Contact.find();
    res.status(200).json(contacts);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération des contacts', error });
  }
};

// Read One
exports.getContactById = async (req, res) => {
  try {
    const Contact = req.connection.models.Contact;
    const contact = await Contact.findById(req.params.id);
    if (!contact) {
      return res.status(500).json({ message: 'Contact introuvable' });
    }
    res.status(200).json(contact);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération du contact', error });
  }
};

// Update
exports.updateContact = async (req, res) => {
  try {
    const Contact = req.connection.models.Contact;
    const updatedContact = await Contact.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json({ message: 'Contact mis à jour', contact: updatedContact });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la mise à jour du contact', error });
  }
};

// Delete
exports.deleteContact = async (req, res) => {
  try {
    const Contact = req.connection.models.Contact;
    await Contact.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Contact supprimé' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la suppression du contact', error });
  }
};
