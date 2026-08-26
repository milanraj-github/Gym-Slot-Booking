const app = require('./app');
const connectMongo = require('./config/mongo');
require('dotenv').config();

const PORT = process.env.PORT || 3000;

(async () => {
  try {
    await connectMongo();
  } catch (err) {
    console.warn('MongoDB connection warning on server startup:', err.message);
  }

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
})();
