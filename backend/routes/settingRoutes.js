const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const settingController = require('../controllers/settingController');


router.get('/public', settingController.getPublicSettings);


router.get('/', protect, admin, settingController.getAllSettings);
router.get('/group/:group', protect, admin, settingController.getSettingsByGroup);
router.get('/:key', protect, admin, settingController.getSetting);
router.put('/', protect, admin, settingController.updateSettings);
router.put('/:key', protect, admin, settingController.updateSetting);
router.post('/reset', protect, admin, settingController.resetSettings);


router.get('/app-config', protect, admin, settingController.getAppConfig);


router.get('/email-templates', protect, admin, settingController.getEmailTemplates);
router.put('/email-templates', protect, admin, settingController.updateEmailTemplate);

module.exports = router; 