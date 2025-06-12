const SibApiV3Sdk = require('sib-api-v3-sdk');
const bcrypt = require('bcrypt');
require('dotenv').config();
const saltRounds = 10; // Niveau de complexité du hachage

const { sendPushNotification } = require('../../utils/notifications');

// Inscription d'un employé
exports.registeremploye = async (req, res) => {
    try {
        const { name, familyName, tel, email, password, role, language, scoreCard, expoPushToken, dsp_code, invitationId } = req.body;
        const Employe = req.connection.models.Employee; // Modèle injecté dynamiquement
        const Invitation = req.connection.models.Invitation; // Modèle dynamique pour Invitation

        // Vérification si l'employé existe déjà
        const existingEmploye = await Employe.findOne({ email });
        if (existingEmploye) {
            return res.status(500).json({ message: 'A user with this email already exists.' });
        }

        // 🔐 Hachage du mot de passe avant stockage
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Création du nouvel employé avec le mot de passe haché
        const newEmploye = new Employe({
            name,
            familyName,
            tel,
            email,
            password: hashedPassword, // 🔥 Stocke le hash au lieu du mot de passe en clair
            role,
            language,
            scoreCard,
            Transporter_ID: '',
            expoPushToken,
            dsp_code,
        });

        await newEmploye.save();

        // ✅ Invalider l'invitation après création de l'utilisateur
        if (invitationId) {
            await Invitation.findByIdAndUpdate(invitationId, { fonctionnel: false });
        }

        // 🔥 Récupérer les tokens Expo des managers
        const managers = await Employe.find({ role: "manager", dsp_code: dsp_code, expoPushToken: { $exists: true } });
        const tokens = managers.map(manager => manager.expoPushToken);

        // 🔥 Envoyer la notification à tous les managers
        // 🔥 Envoyer la notification à tous les managers
        if (tokens.length > 0) {
            const message = `New employee account created: ${name} ${familyName}.`;
            const screen = '(manager)/(tabs)/(RH)/AllEmployees'; // ✅ Screen pour les managers

            for (const token of tokens) {
                await sendPushNotification(token, message, screen);
            }
        }


        res.status(200).json(newEmploye);
    } catch (error) {
        res.status(500).json({ message: 'Error during registration', error });
    }
};


// Inscription d'un manager
exports.registerManager = async (req, res) => {    
    try {
        const { name, familyName, tel, email, password, role, language, scoreCard, expoPushToken, dsp_code } = req.body;
        
        const Employe = req.connection.models.Employee;

        // Vérification si l'employé existe déjà
        const existingEmploye = await Employe.findOne({ email });
        if (existingEmploye) {
            return res.status(500).json({ 
                message: 'An employee with this email already exists.',
                email: email
            });
        }

        // Hachage du mot de passe
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Création du nouvel employé
        const newEmploye = new Employe({
            name,
            familyName,
            tel,
            email,
            password: hashedPassword,
            role,
            language,
            scoreCard,
            Transporter_ID: '',
            expoPushToken,
            dsp_code,
        });

        await newEmploye.save();

        // Configuration de l'email de bienvenue
        const defaultClient = SibApiV3Sdk.ApiClient.instance;
        const apiKey = defaultClient.authentications['api-key'];
        apiKey.apiKey = process.env.BREVO_API_KEY;

        const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
        const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

        sendSmtpEmail.sender = {
            "name": "OPEX LOGISTIX TEAM",
            "email": "opexlogistix@gmail.com"
        };
        sendSmtpEmail.to = [{
            "email": email,
            "name": `${name} ${familyName}`
        }];
        sendSmtpEmail.subject = `Welcome to OPEX LOGISTIX - Your Account Details`;
        sendSmtpEmail.htmlContent = `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto;">
            <div style="padding: 20px;">
              <h2 style="color: #0056b3; margin-top: 0;">Welcome to OPEX LOGISTIX!</h2>
              
              <p>Dear ${name} ${familyName},</p>
              
              <p>Thank you for registering with OPEX LOGISTIX. Below are your account details:</p>
              
              <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #0056b3;">
                <h3 style="margin-top: 0; color: #0056b3;">Your Account Information</h3>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Password:</strong> ${password}</p>
                <p><strong>DSP Code:</strong> ${dsp_code}</p>
                <div style="background: #e6f2ff; padding: 10px; border-radius: 4px; margin-top: 10px; font-size: 14px;">
                  <p style="margin: 0;"><strong>Important:</strong> For security reasons, we strongly recommend changing your password after first login.</p>
                </div>
              </div>
              
              <div style="background: #fff8e1; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
                <h3 style="margin-top: 0; color: #ff6f00;">Subscription Information</h3>
                <p>You're currently on our <strong>1-month free trial</strong> period.</p>
                <p>After the trial period, your subscription will automatically continue at:</p>
                <div style="background: #fff; padding: 10px; border-radius: 4px; text-align: center; margin: 10px 0; border: 1px dashed #ffc107;">
                  <p style="margin: 0; font-size: 18px; font-weight: bold; color: #0056b3;">$200/month</p>
                  <p style="margin: 5px 0 0; font-size: 14px;">(Flat rate regardless of the number of DAs in your team)</p>
                </div>
                <p>We'll send you a reminder email 7 days before your trial ends to confirm your subscription.</p>
                <p>You can cancel anytime before the trial ends to avoid charges.</p>
              </div>
              
              <h3 style="color: #0056b3;">Getting Started</h3>
              <p>We strongly recommend you to:</p>
              <ol>
                <li style="margin-bottom: 15px;">
                  <p>Watch our tutorial videos to learn how to use our application and discover all its features:</p>
                  <a href="https://drive.google.com/drive/u/0/folders/1Wh-earR7eGIZ7ZW-5qXzDj1Yhy0hNWRR" 
                     target="_blank"
                     style="display: inline-block; background: linear-gradient(135deg, #0056b3, #0088cc); 
                            color: white; text-decoration: none; padding: 12px 20px; border-radius: 6px; 
                            font-weight: bold; margin: 5px 0; width: 100%; text-align: center;
                            box-shadow: 0 2px 10px rgba(0,86,179,0.2); transition: all 0.3s ease;">
                    <span style="display: flex; align-items: center; justify-content: center;">
                      <span style="margin-right: 10px; font-size: 20px;">🎬</span>
                      <span>Access OPEX LOGISTIX Tutorials</span>
                    </span>
                  </a>
                  <p style="font-size: 13px; color: #666; margin-top: 5px;">Includes beginner guides, advanced features, and troubleshooting</p>
                </li>
                <li>
                  <p>Download our mobile app:</p>
                  <ul style="list-style-type: none; padding-left: 0; display: flex; gap: 10px; flex-wrap: wrap;">
                    <li style="margin: 5px 0;">
                      <a href="https://apps.apple.com/us/app/opex-logistix/id6743144792" 
                         target="_blank" 
                         style="display: inline-block; background: #000; color: white; padding: 10px 15px; 
                                border-radius: 6px; text-decoration: none; font-weight: bold;
                                transition: all 0.3s ease;">
                        <span style="display: flex; align-items: center;">
                          <span style="margin-right: 8px;">📱</span>
                          App Store
                        </span>
                      </a>
                    </li>
                    <li style="margin: 5px 0;">
                      <a href="https://play.google.com/store/apps/details?id=com.opexlogistics.app" 
                         target="_blank" 
                         style="display: inline-block; background: #0f9d58; color: white; padding: 10px 15px; 
                                border-radius: 6px; text-decoration: none; font-weight: bold;
                                transition: all 0.3s ease;">
                        <span style="display: flex; align-items: center;">
                          <span style="margin-right: 8px;">📱</span>
                          Google Play
                        </span>
                      </a>
                    </li>
                  </ul>
                  <p style="margin-top: 10px;">
                👉 Or use our web version at 
                <a href="https://www.opexlogistic.com" target="_blank" style="color: #0056b3; font-weight: bold;">www.opexlogistic.com</a>
              </p>
                </li>
              </ol>

              <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #eee;">
                <p>If you have any questions or need assistance, please don't hesitate to contact our support team at <a href="mailto:opexlogistix@gmail.com" style="color: #0056b3; text-decoration: none; font-weight: bold;">opexlogistix@gmail.com</a>.</p>
                
                <p>Best regards,</p>
                  <p><strong>The OPEX LOGISTIX Team</strong></p>
                 <p><strong>Opexlogistix Inc.</strong><br>
                📞 +1 438-225-4332<br>
                📧 <a href="mailto:opexlogistix@gmail.com" style="color: #0056b3; text-decoration: none;">opexlogistix@gmail.com</a><br>
                📍 1234 rue de Laprairie, Montréal, Québec, Canada H3K2V8</p>
              </div>
            </div>
            
            <div style="background: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #777;">
              <p>This email was sent automatically from the OPEX LOGISTIX system.</p>
              <p>© ${new Date().getFullYear()} OPEX LOGISTIX. All rights reserved.</p>
            </div>
          </div>
        `;

        // Envoi de l'email
        await apiInstance.sendTransacEmail(sendSmtpEmail);

        res.status(201).json({
            status: 'success',
            message: 'Manager registered and welcome email sent successfully',
            employee: {
                id: newEmploye._id,
                name: newEmploye.name,
                email: newEmploye.email,
                role: newEmploye.role,
                dsp_code: newEmploye.dsp_code
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        
        // Journalisation détaillée de l'erreur
        const errorDetails = {
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString(),
            requestBody: req.body,
            errorType: error.name
        };
        
        console.error('[registerManager] Détails de l\'erreur:', JSON.stringify(errorDetails, null, 2));
        
        res.status(500).json({ 
            status: 'error',
            message: 'Error during manager registration or sending welcome email',
            error: process.env.NODE_ENV === 'development' ? errorDetails : 'Internal server error',
            timestamp: new Date().toISOString()
        });
    }
};



exports.loginemploye = async (req, res) => {
    try {
        if (!req.connection) {
            throw new Error('Connexion MongoDB non injectée dans req.connection.');
        }

        if (!req.connection.models) {
            throw new Error('Les modèles MongoDB ne sont pas injectés dans req.connection.models.');
        }

        const Employe = req.connection.models.Employee;
        if (!Employe) {
            throw new Error('Le modèle "Employee" n\'est pas enregistré dans la connexion.');
        }

        const { email, password, expoPushToken } = req.body; // 🔹 Récupère expoPushToken
        const existingEmploye = await Employe.findOne({ email });

        // 🔴 Vérification de l'existence de l'employé
        if (!existingEmploye) {
            return res.status(500).json({ message: 'Incorrect email or password.' });
        }

        // 🔐 Comparaison du mot de passe haché
        const isMatch = await bcrypt.compare(password, existingEmploye.password);
        if (!isMatch) {
            return res.status(500).json({ message: 'Incorrect email or password.' });
        }

        // 🔹 Mise à jour de l'expoPushToken seulement si fourni
        if (expoPushToken) {
            await Employe.updateOne(
                { _id: existingEmploye._id },
                { $set: { expoPushToken } }
            );
        }

        res.status(200).json(existingEmploye);
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la connexion', error: error.message });
    }
};





// Récupération du profil d'un employé
exports.getemployeProfile = async (req, res) => {
    try {
        const Employe = req.connection.models.Employee; // Modèle injecté dynamiquement
        const employe = await Employe.findById(req.params.id);

        if (!employe) {
            return res.status(500).json({ message: 'Employé introuvable.' });
        }

        res.status(200).json(employe);
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la récupération du profil', error });
    }
};

// Suppression d'un employé
exports.deleteEmploye = async (req, res) => {
    try {
        const Employe = req.connection.models.Employee; // Modèle injecté dynamiquement
        const employe = await Employe.findByIdAndDelete(req.params.id);

        if (!employe) {
            return res.status(500).json({ message: 'Employé introuvable.' });
        }

        res.status(200).json({ message: 'Employé supprimé avec succès.' });
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la suppression', error });
    }
};


exports.updateEmployeePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        const Employe = req.connection.models.Employee; // Modèle injecté dynamiquement

        // Vérifier si l'utilisateur existe
        const employe = await Employe.findById(req.params.id);
        if (!employe) {
            return res.status(404).json({ message: 'Employé introuvable.' });
        }

        // Vérifier si l'ancien mot de passe est correct
        const isMatch = await bcrypt.compare(oldPassword, employe.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Ancien mot de passe incorrect.' });
        }

        // Hacher le nouveau mot de passe
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        // Mettre à jour le mot de passe
        employe.password = hashedPassword;
        await employe.save();

        res.status(200).json({ message: 'Mot de passe mis à jour avec succès.' });
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la mise à jour du mot de passe.', error: error.message });
    }
};

// Mise à jour du profil d'un employé
exports.updateemployeProfile = async (req, res) => {
    try {
        const Employe = req.connection.models.Employee; // Modèle injecté dynamiquement
        const updatedEmploye = await Employe.findByIdAndUpdate(req.params.id, req.body, { new: true });

        if (!updatedEmploye) {
            return res.status(500).json({ message: 'Employé introuvable.' });
        }

        res.status(200).json(updatedEmploye);
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la mise à jour', error });
    }
};

// Récupérer tous les employés
exports.getAllEmployees = async (req, res) => {
    try {
        const Employe = req.connection.models.Employee;

        if (!Employe) {
            return res.status(500).json({ error: 'Le modèle Employee n\'est pas disponible dans la connexion actuelle.' });
        }

        const employees = await Employe.find() || [];

        res.status(200).json(employees);
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la récupération des employés.', details: error.message });
    }
};


// Mise à jour des scoreCards
exports.updateScoreCardByTransporterIDs = async (req, res) => {
    try {
        const Employe = req.connection.models.Employee; // Modèle injecté dynamiquement
        const transporters = req.body;
        const updateResults = [];

        for (const transporter of transporters) {
            const employe = await Employe.findOne({ Transporter_ID: transporter.Transporter_ID });

            if (!employe) {
                updateResults.push({ Transporter_ID: transporter.Transporter_ID, status: 'Not Found' });
                continue;
            }

            employe.scoreCard = transporter.scoreCard;
            employe.focusArea = transporter.focusArea || employe.focusArea;
            await employe.save();

            // ✅ Envoi de notification avec screen selon le rôle
            if (employe.expoPushToken) {
                let screen = '';
                if (employe.role === 'manager') {
                    screen = '(manager)/(tabs)/(accueil)/Profile';
                } else if (employe.role === 'driver') {
                    screen = '(driver)/(tabs)/(Employe)/Profile';
                }

                const message = `Your new Score Card is : ${transporter.scoreCard}`;
                await sendPushNotification(employe.expoPushToken, message, screen);
            }

            updateResults.push({ Transporter_ID: transporter.Transporter_ID, status: 'Updated Successfully' });
        }

        res.status(200).json({ message: 'Mise à jour terminée', results: updateResults });
    } catch (error) {
        console.error('Erreur lors de la mise à jour des scoreCards :', error);
        res.status(500).json({ message: 'Erreur lors de la mise à jour des scoreCards', error });
    }
};



// Récupérer plusieurs employés par ID
exports.getEmployeesByIds = async (req, res) => {
    try {
        const Employe = req.connection.models.Employee;
        const { ids } = req.body;

        if (!Employe) {
            return res.status(500).json({ error: 'Le modèle Employee n\'est pas disponible dans la connexion actuelle.' });
        }

        const employees = await Employe.find({ _id: { $in: ids } }) || [];

        res.status(200).json(employees);
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la récupération des employés.', details: error.message });
    }
};

