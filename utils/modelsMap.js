const mongoose = require('mongoose');

// Importation des modèles
const Clothes = require('../clothes-api/models/Clothes');
const ClothesAssignment = require('../clothes-assignment-api/models/ClothesAssignment');
const Comment = require('../Comment-api/models/Comment');
const DailyNote = require('../DailyNote/models/DailyNote');
const DailyViolation = require('../DailyViolation-api/models/DailyViolation');
const Disponibilite = require('../Disponibiltes-api/models/disponibilite');
const Event = require('../events-api/models/eventModel');
const ExtraRoad = require('../ExtraRoad-api/models/Road');
const Vehicle = require('../Fleet-api/models/vehicle');
const InventoryItem = require('../Inventory-api-complet/models/InventoryItem');
const Conversation = require('../Messenger-api/models/conversationModel');
const Message = require('../Messenger-api/models/messageModel');
const Phone = require('../Phones-api/models/Phone');
const PowerBank = require('../PowerBank-api/models/PowerBank');
const Procedure = require('../Procedures-api/models/Procedure');
const Quiz = require('../Quiz-api/models/quiz');
const ReportIssues = require('../ReportIssues/models/reportIssuesModel');
const Shift = require('../Shifts-api/models/shift');
const Status = require('../Status/models/statusModel');
const TimeCard = require('../TimeCard-api/models/TimeCard');
const VanAssignment = require('../VanAssignmen-api/models/VanAssignment');
const Worning = require('../Warnings-api/models/worning');
const Employee = require('../Employes-api/models/Employee');
const EquipmentUpdate = require('../EquipmentUpdate-api/models/EquipmentUpdate')
const QuizAssignment = require ('../Quiz-api/models/quizAssignmentSchema')
const Contact = require ('../Contacts-api/models/contactModel')
const Invitation = require ('../Invitation-api/models/invitations')

// Mapping des modèles
const modelsMap = {
  Clothes,
  ClothesAssignment,
  Comment,
  DailyNote,
  DailyViolation,
  Disponibilite,
  Event,
  ExtraRoad,
  Vehicle,
  InventoryItem,
  Conversation,
  Message,
  Phone,
  PowerBank,
  Procedure,
  Quiz,
  ReportIssues,
  Shift,
  Status,
  TimeCard,
  VanAssignment,
  Worning,
  Employee,
  QuizAssignment,
  EquipmentUpdate,
  Contact,
  Invitation
};

/**
 * Vérifie que tous les modèles dans `modelsMap` sont valides
 */
const validateModelsMap = () => {
  for (const [modelName, model] of Object.entries(modelsMap)) {
    if (!model || !(model instanceof mongoose.Schema || typeof model.schema === 'object')) {
      throw new Error(`Modèle "${modelName}" invalide ou mal configuré.`);
    }
  }
};

// Valide les modèles au moment du chargement
try {
  validateModelsMap();
} catch (error) {
  console.log('Erreur lors de la validation des modèles :', error.message);
  process.exit(1); // Arrête l'application si les modèles sont invalides
}

module.exports = modelsMap;
