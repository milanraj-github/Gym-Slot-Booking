const validate = (schemaMap) => {
  return (req, res, next) => {
    const errors = [];

    ['params', 'query', 'body'].forEach((key) => {
      if (schemaMap[key]) {
        const { error, value } = schemaMap[key].validate(req[key], { abortEarly: false });
        if (error) {
          error.details.forEach((detail) => {
            errors.push({
              field: detail.path.join('.') || key,
              message: detail.message.replace(/"/g, '')
            });
          });
        } else {
          req[key] = value;
        }
      }
    });

    if (errors.length > 0) {
      return res.status(400).json({
        message: 'Validation failed',
        errors
      });
    }

    next();
  };
};

module.exports = validate;
