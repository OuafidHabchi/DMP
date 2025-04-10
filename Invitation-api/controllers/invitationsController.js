const SibApiV3Sdk = require('sib-api-v3-sdk');

exports.addEmployeFromManager = async (req, res) => {
    try {
        const { dsp_code, email } = req.body;

        if (!dsp_code || !email) {
            return res.status(500).json({ message: "Dsp_Code and email are required." });
        }
        // ✅ 1. Enregistrer l'invitation dans MongoDB d'abord pour obtenir l'ID
        const Invitation = req.connection.models.Invitation;
        const newInvitation = new Invitation({
            dsp_code,
            email,
            fonctionnel: true,
        });

        await newInvitation.save();

        // ✅ 2. Générer le lien personnalisé avec l'_id de l'invitation
        const deepLink = `myapp://signup?code=${dsp_code}&invitationId=${newInvitation._id}`;

        // ✅ 3. Configurer Brevo API
        var defaultClient = SibApiV3Sdk.ApiClient.instance;
        var apiKey = defaultClient.authentications['api-key'];
        apiKey.apiKey = process.env.BREVO_API_KEY;

        if (!process.env.BREVO_API_KEY) {            
            return res.status(500).json({ message: "Server error: Missing email API key." });
        }

        // ✅ 4. Préparer l'email
        const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
        const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

        sendSmtpEmail.sender = {
            "name": "OPEX LOGISTIX TEAM",
            "email": "opexlogistix@gmail.com"
        };
        sendSmtpEmail.to = [{ "email": email }];
        sendSmtpEmail.subject = "Welcome to OPEX LOGISTIX - Create Your Account";

        sendSmtpEmail.htmlContent = `
        <div style="font-family: 'Arial', sans-serif; max-width: 600px; margin: auto; background: #ffffff; padding: 20px; border-radius: 8px; border: 1px solid #ddd;">
            
            <h2 style="color: #333; text-align: center; font-size: 22px;">Welcome to OPEX LOGISTIX</h2>
            
            <p style="font-size: 16px; color: #555; line-height: 1.5;">
                Hello, <br><br>
                You have been invited to join <strong>OPEX LOGISTIX</strong>. Please follow these steps to complete your registration:
            </p>
    
            <p style="font-size: 16px; color: #555; line-height: 1.5;"><strong>Step 1:</strong> Download the OPEX LOGISTIX app:</p>
    
            <div style="display: flex; justify-content: center; margin: 15px 0;">
                <a href="https://play.google.com/apps/testing/com.opexlogistics.app" 
                style="background: #007bff; color: #ffffff; padding: 12px 20px; border-radius: 5px; text-decoration: none; font-size: 14px; font-weight: bold; margin-right: 20px; box-shadow: 2px 2px 6px rgba(0,0,0,0.2);">
                📱 Android</a>
    
                <a href="https://apps.apple.com/us/app/opex-logistix/id6743144792" 
                style="background: #007bff; color: #ffffff; padding: 12px 20px; border-radius: 5px; text-decoration: none; font-size: 14px; font-weight: bold; box-shadow: 2px 2px 6px rgba(0,0,0,0.2);">
                🍏 iOS</a>
            </div>

            <p style="font-size: 16px; color: #555; line-height: 1.5;"><strong>Step 2:</strong> <span style="color: red; font-weight: bold;">Do not open the app</span> after downloading.</p>
            <p style="font-size: 16px; color: #555; line-height: 1.5;"><strong>Step 3:</strong> Click the button below to create your account.</p>
    
            <div style="text-align: center; margin: 20px 0;">
                <a href="${deepLink}" 
                style="background: #28a745; color: #ffffff; padding: 14px 24px; border-radius: 5px; text-decoration: none; font-size: 16px; font-weight: bold; display: inline-block; box-shadow: 2px 2px 6px rgba(0,0,0,0.2);">
                  Create My Account</a>
            </div>
    
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">

             <p style="font-size: 14px; color: #555; line-height: 1.5;">
        🎥 <strong>Want to see how the app works?</strong><br>
        Watch our short video tutorial that explains the main features and how to use OPEX LOGISTIX effectively:
    </p>

    <div style="text-align: center; margin: 15px 0;">
        <a href="https://drive.google.com/file/d/19OZPu6lIheAwVLgvp7Q0TFHxRwvAAuoX/view?usp=sharing" 
        style="background: #6c63ff; color: #ffffff; padding: 10px 20px; border-radius: 5px; text-decoration: none; font-size: 14px; font-weight: bold; box-shadow: 2px 2px 6px rgba(0,0,0,0.2);">
        ▶️ Watch the App Tutorial</a>
    </div>
    
            <p style="font-size: 14px; color: #777; text-align: center;">
                If you have any questions, feel free to contact our support team. <br>
                This email was sent automatically from <strong>OPEX LOGISTIX</strong>.
            </p>
    
        </div>
    `;

        // ✅ 5. Envoyer l'email
        try {
            await apiInstance.sendTransacEmail(sendSmtpEmail);
            res.status(200).json({ message: 'Account creation email sent successfully and invitation saved' });
        } catch (emailError) {
            await Invitation.findByIdAndDelete(newInvitation._id);
            return res.status(500).json({ message: 'Error sending the email, invitation removed', error: emailError });
        }

    } catch (error) {
        res.status(500).json({ message: 'Error processing the request', error });
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
