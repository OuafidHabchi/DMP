// const SibApiV3Sdk = require('sib-api-v3-sdk');
// require('dotenv').config();

// // Configure Brevo API client
// const defaultClient = SibApiV3Sdk.ApiClient.instance;
// const apiKey = defaultClient.authentications['api-key'];
// apiKey.apiKey = process.env.BREVO_API_KEY;

// // Email recipients list
// const recipients = [
//     { email: 'alliancets.logistics@gmail.com', name: 'Alliance T&S Dispatcher' },
//     { email: 'dispacher@afmluna.com', name: 'AFML Dispatcher' },
//     { email: 'eliaskebbab@gmail.com', name: 'Elias Kebbab' },
//     { email: 'afmalexandredorosario@outlook.com', name: 'Alexandre Do Rosario' },
//     { email: 'alexandre@afmluna.com', name: 'Alexandre do Rosario' },
//     { email: 'casa.dispatch1@gmail.com', name: 'Casa dispatch' },
//     { email: 'christbw@amazon.com', name: 'Bailey, Christopher' },
//     { email: 'dispatch.cnkt@gmail.com', name: 'CNKT - OPERATIONS' },
//     { email: 'cnktlogistiques@gmail.com', name: 'CNKT Logistiques' },
//     { email: 'operationcnkt@gmail.com', name: 'CNKT-OPERATIONS' },
//     { email: 'dispatch.cnkt2@gmail.com', name: 'Dispatch CNKT' },
//     { email: 'dispatch.eastview@gmail.com', name: 'Dispatch Eastview' },
//     { email: 'dispatch.route961@gmail.com', name: 'Dispatch R961' },
//     { email: 'edematt@amazon.com', name: 'Edelenyi, Matthias' },
//     { email: 'carlfahd@amazon.com', name: 'Fahd, Carl' },
//     { email: 'dispatch@flxp.ca', name: 'FLXP Dispatch' },
//     { email: 'hadhanna@amazon.com', name: 'Haddad, Johnny' },
//     { email: 'hosam.route961@gmail.com', name: 'Hosam El Serti' },
//     { email: 'jihadslaiby@hotmail.com', name: 'Jihad' },
//     { email: 'malik@msntransport.ca', name: 'malik' },
//     { email: 'maryhanna.route961@gmail.com', name: 'Mary Hanna' },
//     { email: 'mohamed.ghamraoui67@gmail.com', name: 'Mohamed' },
//     { email: 'ferdjani.m.atsl@gmail.com', name: 'Mohamed Amine Ferdjani' },
//     { email: 'kardous@hotmail.com', name: 'Mohamed Kardous' },
//     { email: 'salamacasa7@gmail.com', name: 'Mohamed salama' },
//     { email: 'choucaircasa@gmail.com', name: 'Nagib Choucair' },
//     { email: 'eastviewlogistics@gmail.com', name: 'Nicolas Fuoco' },
//     { email: 'msntdispatch@gmail.com', name: 'MSNTdispatch' },
//     { email: 'nicolasluna@gmail.com', name: 'Nicolas Luna' },
//     { email: 'niikotei.h@outlook.com', name: 'Niikotei Hammond' },
//     { email: 'nimas@msntransport.ca', name: 'Nima' },
//     { email: 'omar9malik@gmail.com', name: 'omar malik' },
//     { email: 'karasahin2362@hotmail.com', name: 'Sahin' },
//     { email: 'sam.route961@gmail.com', name: 'Salim Jaoude' },
//     { email: 'litianchao007@gmail.com', name: 'Tianchao Li' },
//     { email: 'tracypjoya@hotmail.com', name: 'Tracy Perez' },
//     { email: 'ziadz.cnkt@outlook.com', name: 'Ziad Zouaq' },
//     { email: 'bqqsiyer@amazon.com', name: 'Qsiyer, Billal' },
//     { email: 'votrecolis.senc@gmail.com', name: 'mustapha DEBBOUZ' }
//   ];
  

// const emailSubject = 'Opex Logistix – The Perfect App for Your Fresh Start in the USA';
// const emailHtmlContent = `
//   <div style="font-family: Arial, sans-serif; color: #333; padding: 20px; max-width: 600px; margin: auto; background-color: #f4f4f4; border-radius: 10px;">
//     <h2 style="color: #007BFF;">Hello,</h2>
    
//     <p>We hope this message finds you well.</p>
    
//     <p>As former DSP managers or owners at DXT6, you have extensive experience in logistics. As you prepare for your fresh start in the USA, we believe <strong>Opex Logistix</strong> can be the ideal solution to streamline and optimize your new delivery operations.</p>
    
//     <hr style="border: 1px solid #ddd; margin: 20px 0;">
    
//     <p>We are thrilled to introduce a special video that demonstrates how Opex Logistix can elevate your operations. Our app is packed with features like:</p>
//     <ul style="padding-left: 20px;">
//       <li><strong>Automated Scheduling</strong> for seamless shift management</li>
//       <li><strong>Real-Time Performance Tracking</strong> to ensure success</li>
//       <li><strong>Instant Communication</strong> for faster team coordination</li>
//     </ul>
    
//     <div style="background-color: #e9f5ff; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
//   <p style="font-weight: bold; font-size: 18px; margin: 0;">
//     🎥 <a href="https://www.youtube.com/watch?v=zVMuPziSedY" style="color: #007BFF; text-decoration: none;">Click here to watch the video and see how Opex Logistix can transform your delivery operations</a>
//   </p>
// </div>

    
//     <hr style="border: 1px solid #ddd; margin: 20px 0;">
    
//     <p>With Opex Logistix, you'll have the tools you need to effectively manage your team and operations as you establish your presence in the U.S. We're confident that our solution will help you hit the ground running with a fresh start.</p>
    
//     <p>Please feel free to reach out if you have any questions or would like a personalized demo.</p>
    
//     <br>
//     <p style="font-weight: bold;">Best regards,<br>
//     <span style="color: #007BFF;">Opex Logistix Team</span></p>
    
//     <p>📞 <strong>Phone:</strong> +1 438-225-4332</p>
//     <p>📧 <strong>Email:</strong> <a href="mailto:opexlogistix@gmail.com" style="color: #007BFF;">opexlogistix@gmail.com</a></p>
//     <p>🌐 <strong>Website:</strong> <a href="https://www.opexlogistic.com" style="color: #007BFF;">https://www.opexlogistic.com</a></p>
//   </div>
// `;



// async function sendEmails() {
//     try {
//         const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

//         // Create email object
//         const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
//         sendSmtpEmail.sender = {
//             name: "OPEX LOGISTIX TEAM",
//             email: "opexlogistix@gmail.com"
//         };
//         sendSmtpEmail.to = recipients;
//         sendSmtpEmail.subject = emailSubject;
//         sendSmtpEmail.htmlContent = emailHtmlContent;

//         // Send email
//         const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
//         console.log('Emails sent successfully:', response);
//         return response;
//     } catch (error) {
//         console.error('Error sending emails:', error);
//         throw error;
//     }
// }

// // Execute the function
// sendEmails()
//     .then(() => console.log('Email sending process completed'))
//     .catch(err => console.error('Error in email sending process:', err));