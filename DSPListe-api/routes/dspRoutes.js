const express = require('express');
const dspController = require('../controllers/dspController');

const router = express.Router();

// Routes pour DSPliste
router.get('/', dspController.getAllDSP);
router.post('/create', dspController.createDSP);
router.put('/:dsp_code', dspController.updateDSP);
router.delete('/:dsp_code', dspController.deleteDSP);
router.get('/get/:dsp_code', dspController.getDSPById);
router.get('/logs/:dsp_code', dspController.getDSPLogs);
router.get('/allMessages', dspController.getAllContacts);
// Marquer un message comme lu
router.put('/:dsp_code/messages/:id/read', dspController.markAsRead);
// Marquer un message comme fixé
router.put('/:dsp_code/messages/:id/fix', dspController.markAsFixed);



module.exports = router;
