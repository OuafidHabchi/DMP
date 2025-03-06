const SibApiV3Sdk = require('sib-api-v3-sdk');

exports.addEmployeFromManager = async (req, res) => {
  try {
    const { dsp_code, email } = req.body;

    if (!dsp_code || !email) {
      return res.status(500).json({ message: "Dsp_Code and email are required." });
    }

    // ✅ 1. Utilisation du modèle dynamique
    const Invitation = req.connection.models.Invitation;

    // ✅ 2. Enregistrer l'invitation dans MongoDB
    const newInvitation = new Invitation({
      dsp_code,
      email,
      fonctionnel: true,
    });
    await newInvitation.save();

    // ✅ 3. Générer le lien personnalisé avec l'_id de l'invitation
    const deepLink = `myapp://signup?code=${dsp_code}&invitationId=${newInvitation._id}`;
    const clickableLink = `<a href="${deepLink}" style="color: blue; text-decoration: underline;">Create my account</a>`;

    // ✅ 4. Configurer Brevo API
    var defaultClient = SibApiV3Sdk.ApiClient.instance;
    var apiKey = defaultClient.authentications['api-key'];
    apiKey.apiKey = process.env.BREVO_API_KEY;

    // ✅ 5. Créer l'email de bienvenue
    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

    sendSmtpEmail.sender = {
      "name": "DMP Management Team",
      "email": "dspmanagementpartenaire@gmail.com"
    };
    sendSmtpEmail.to = [{ "email": email }];
    sendSmtpEmail.subject = "Welcome to DMP Management - Create Your Account";

    sendSmtpEmail.htmlContent = `
      <h3>Welcome to DMP Management!</h3>
      <p>We are excited to have you on board.</p>
      <p>Before creating your account, please download our app if you haven't already:</p>
      <ul>
        <li><a href="https://play.google.com/store/apps/details?id=com.myapp">Download for Android</a></li>
        <li><a href="https://apps.apple.com/us/app/myapp/idXXXXXXXXX">Download for iOS</a></li>
      </ul>
      <p>Once the app is installed, click the link below to complete your registration:</p>
      <p>${clickableLink}</p>
      <hr>
      <p>If you have any questions, feel free to contact us.</p>
      <p>This email was sent automatically from the DSP Management system.</p>
    `;

    // ✅ 6. Envoyer l'email
    await apiInstance.sendTransacEmail(sendSmtpEmail);

    res.status(200).json({ message: 'Account creation email sent successfully' });

  } catch (error) {
    res.status(500).json({ message: 'Error sending the email', error });
  }
};


// ✅ Vérifie si une invitation est fonctionnelle
exports.checkInvitationStatus = async (req, res) => {
    try {
        const { invitationId } = req.params;
        const Invitation = req.connection.models.Invitation; // Modèle dynamique

        if (!invitationId) {
            return res.status(500).json({ message: "Invitation ID is required.", status: false });
        }

        const invitation = await Invitation.findById(invitationId);

        // 🔥 Si l'invitation n'existe pas ou n'est pas fonctionnelle
        if (!invitation || !invitation.fonctionnel) {
            return res.status(200).json({ 
                message: "Invitation is no longer functional or not found.", 
                status: false 
            });
        }

        // ✅ Si l'invitation est trouvée et fonctionnelle
        return res.status(200).json({ 
            message: "Invitation is still functional.", 
            status: true 
        });
        
    } catch (error) {
        res.status(500).json({ message: "Error checking invitation status.", error, status: false });
    }
};



// ✅ Rend une invitation non fonctionnelle (fonctionnel: false)
exports.invalidateInvitation = async (req, res) => {
    try {
        const { invitationId } = req.params;
        const Invitation = req.connection.models.Invitation; // Modèle dynamique

        if (!invitationId) {
            return res.status(500).json({ message: "Invitation ID is required." });
        }

        // ✅ Mise à jour de `fonctionnel` à false
        const updatedInvitation = await Invitation.findByIdAndUpdate(
            invitationId,
            { fonctionnel: false },
            { new: true }
        );

        if (!updatedInvitation) {
            return res.status(500).json({ message: "Invitation not found." });
        }

        res.status(200).json({ message: "Invitation has been invalidated.", invitation: updatedInvitation });
    } catch (error) {
        res.status(500).json({ message: "Error invalidating invitation.", error });
    }
};


// ✅ Récupère toutes les invitations pour un `dsp_code`
exports.getAllInvitations = async (req, res) => {
    try {
        const { dsp_code } = req.query;
        const Invitation = req.connection.models.Invitation; // Modèle dynamique

        if (!dsp_code) {
            return res.status(500).json({ message: "Dsp_Code is required." });
        }

        // ✅ Récupération de toutes les invitations pour ce dsp_code
        const invitations = await Invitation.find({ dsp_code }).sort({ createdAt: -1 });

        res.status(200).json({ invitations });
    } catch (error) {
        res.status(500).json({ message: "Error fetching invitations.", error });
    }
};


// ✅ Supprime une invitation par son ID
exports.deleteInvitation = async (req, res) => {
    try {
        const { invitationId } = req.params;        
        const Invitation = req.connection.models.Invitation; // Modèle dynamique

        // ✅ Vérification de l'ID de l'invitation
        if (!invitationId) {
            return res.status(500).json({ message: "Invitation ID is required." });
        }

        // ✅ Suppression de l'invitation par son ID
        const deletedInvitation = await Invitation.findByIdAndDelete(invitationId);

        // ✅ Vérification si l'invitation a bien été trouvée et supprimée
        if (!deletedInvitation) {
            return res.status(500).json({ message: "Invitation not found." });
        }

        res.status(200).json({ message: "Invitation has been successfully deleted." });
    } catch (error) {
        res.status(500).json({ message: "Error deleting invitation.", error });
    }
};
