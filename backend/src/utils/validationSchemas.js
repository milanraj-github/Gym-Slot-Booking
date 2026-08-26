const Joi = require('joi');

const registerSchema = {
  body: Joi.object({
    name: Joi.string().trim().min(1).max(100).required().messages({
      'string.empty': 'Name is required',
      'any.required': 'Name is required'
    }),
    email: Joi.string().trim().email().required().messages({
      'string.email': 'Email must be a valid email',
      'string.empty': 'Email is required',
      'any.required': 'Email is required'
    }),
    password: Joi.string().required().messages({
      'string.empty': 'Password is required',
      'any.required': 'Password is required'
    })
  }).unknown(true)
};

const loginSchema = {
  body: Joi.object({
    email: Joi.string().trim().email().required().messages({
      'string.email': 'Email must be a valid email',
      'string.empty': 'Email is required',
      'any.required': 'Email is required'
    }),
    password: Joi.string().required().messages({
      'string.empty': 'Password is required',
      'any.required': 'Password is required'
    })
  }).unknown(true)
};

const slotQuerySchema = {
  query: Joi.object({
    date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required().messages({
      'string.pattern.base': 'Valid date is required in YYYY-MM-DD format',
      'string.empty': 'Valid date is required in YYYY-MM-DD format',
      'any.required': 'Valid date is required in YYYY-MM-DD format'
    })
  }).unknown(true)
};

const createBookingSchema = {
  body: Joi.object({
    slotId: Joi.string().uuid().required().messages({
      'string.guid': 'slotId must be a valid UUID',
      'string.empty': 'slotId is required',
      'any.required': 'slotId is required'
    })
  }).unknown(true)
};

const cancelBookingSchema = {
  params: Joi.object({
    id: Joi.string().uuid().required().messages({
      'string.guid': 'Booking ID must be a valid UUID',
      'string.empty': 'Booking ID is required',
      'any.required': 'Booking ID is required'
    })
  }).unknown(true)
};

module.exports = {
  registerSchema,
  loginSchema,
  slotQuerySchema,
  createBookingSchema,
  cancelBookingSchema
};
