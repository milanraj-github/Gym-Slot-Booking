const express = require('express');
const { getSlots } = require('../controllers/slotController');
const authMiddleware = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const { slotQuerySchema } = require('../utils/validationSchemas');

const router = express.Router();

router.get('/', authMiddleware, validate(slotQuerySchema), getSlots);

module.exports = router;
