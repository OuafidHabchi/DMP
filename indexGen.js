const express = require('express');
const cors = require('cors');
const http = require('http'); // Importer http pour créer le serveur
const socketIo = require('socket.io'); // Importer Socket.IO
const path = require('path');
require('dotenv').config();
// Initialisation de l'application
const app = express();
// Création du serveur HTTP avec Express
const server = http.createServer(app);
// Middleware global
app.use(cors());
app.use(express.json());
// Importer le middleware
const logAccess = require('./DSPListe-api/midlewares/logAccess');
// Appliquer le middleware globalement
app.use(logAccess);

// Chemin relatif basé sur le répertoire du script
const UPLOADS_DIR = path.join(__dirname, 'Messenger-api/uploads');

// Servir les fichiers statiques
app.use('/uploads', express.static(UPLOADS_DIR));

// Servir les fichiers uploadés pour EquipmentUpdate
app.use('/equipment-uploads', express.static(path.join(__dirname, 'EquipmentUpdate-api/uploadsequipment')));

// Servir les fichiers uploadés pour DailyNotes
app.use('/uploads-daily-notes', express.static(path.join(__dirname, 'DailyNote/uploadsdailynote')));

app.use('/uploads-wornings', express.static(path.join(__dirname, 'Warnings-api/uploads-wornings')));

app.use('/uploads-timecard', express.static(path.join(__dirname, 'TimeCard-api/timecarduploads')));

const connectToDSP = require('./DSPListe-api/config/database');
const {loadInitialDatabaseMap } = require('./DSPListe-api/services/dspService');

// Connexion à MongoDB et chargement initial de la liste
const displayDatabaseMap = async () => {
  await connectToDSP(); // Connexion à MongoDB
  await loadInitialDatabaseMap(); // Chargement de la liste des mappings
};

displayDatabaseMap();


// Initialisation de Socket.IO
const io = socketIo(server, {
  cors: {
    origin: '*', // Autoriser toutes les origines
    methods: ['GET', 'POST'], // Autoriser ces méthodes
  },
});



// Middleware pour initialiser req.requiredModels par défaut
app.use((req, res, next) => {
  if (!req.requiredModels) {
    req.requiredModels = []; // Initialiser un tableau vide si non défini
  }
  next();
});

// Import des routes de vos APIs
const ScroceCrd = require('./ScoreCard-api/routes/csvRoutes');
const messageRoutes = require('./Messenger-api/routes/messageRoutes');
const conversationRoutes = require('./Messenger-api/routes/conversationRoutes');
const clothesRoutes = require('./clothes-api/routes/clothesRoutes');
const assignmentRoutes = require('./clothes-assignment-api/routes/clothesAssignmentRoutes');
const commentRoutes = require('./Comment-api/routes/commentRoutes');
const dailyNoteRoutes = require('./DailyNote/routes/dailyNoteRoutes');
const dailyViolationRoutes = require('./DailyViolation-api/routes/dailyViolationRoutes');
const disponibiliteRoutes = require('./Disponibiltes-api/routes/disponibiliteRoutes');
const employeRoutes = require('./Employes-api/routes/EmployeRoutes');
const eventsRoutes = require('./events-api/routes/eventRoutes');
const roadRoutes = require('./ExtraRoad-api/routes/RoadRoutes');
const vehicleRoutes = require('./Fleet-api/routes/vehicleRoutes');
const inventoryRoutes = require('./Inventory-api-complet/routes/inventoryRoutes');
const phoneRoutes = require('./Phones-api/routes/phoneRoutes');
const powerBankRoutes = require('./PowerBank-api/routes/powerBankRoutes');
const procedureRoutes = require('./Procedures-api/routes/procedureRoutes');
const quizRoutes = require('./Quiz-api/routes/quizRoutes');
const reportIssuesRoutes = require('./ReportIssues/routes/reportIssuesRoutes');
const shiftRoutes = require('./Shifts-api/routes/shiftRoutes');
const statusRoutes = require('./Status/routes/statusRoutes');
const timeCardRoutes = require('./TimeCard-api/routes/timeCardRoutes');
const vanAssignmentRoutes = require('./VanAssignmen-api/routes/vanAssignmentRoutes');
const warningRoutes = require('./Warnings-api/routes/worningRoutes');
const download = require('./Inventory-api/routes/pdfRoutes');
const equipmentUpdateRoutes = require('./EquipmentUpdate-api/routes/EquipmentUpdateRoutes');
const prediction = require('./Prediction-api/Prediction')
const dspRoutes = require('./DSPListe-api/routes/dspRoutes');
const contactRoutes = require('./Contacts-api/routes/contactRoutes');
const invitationRoutes = require('./Invitation-api/routes/invitationsRoutes');
const RequestAccessRoutes = require('./requestAcces-api/routes/requestAccessRoutes');






// Utilisation des routes avant le middleware dbMiddleware
app.use('/api/conversations', conversationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/clothes', clothesRoutes);
app.use('/api/clothesAssignment', assignmentRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/dailyNotes', dailyNoteRoutes);
app.use('/api/dailyViolations', dailyViolationRoutes);
app.use('/api/disponibilites', disponibiliteRoutes);
app.use('/api/employee', employeRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/roads', roadRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/phones', phoneRoutes);
app.use('/api/powerbanks', powerBankRoutes);
app.use('/api/procedure', procedureRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/reportIssues', reportIssuesRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/statuses', statusRoutes);
app.use('/api/timecards', timeCardRoutes);
app.use('/api/vanAssignments', vanAssignmentRoutes);
app.use('/api/warnings', warningRoutes);
app.use('/api/download', download);
app.use('/api/ScroceCrd', ScroceCrd);
app.use('/api/equipment-update', equipmentUpdateRoutes);
app.use('/api/prediction', prediction);
app.use('/api/dspliste', dspRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/invitations', invitationRoutes);
app.use('/api/RequestAccessRoutes', RequestAccessRoutes);



// Ajouter Socket.IO à l'application
app.set('socketio', io);

// Gestion des événements Socket.IO
io.on('connection', (socket) => {
  console.log('Nouvelle connexion Socket.oioioiIO', socket.id);

  socket.on('disconnect', () => {
    console.log('Utilisateur déconnecté', socket.id);
  });
});

// Démarrer le serveur sur un port unique
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Central API server running on port ${PORT}`);
});
