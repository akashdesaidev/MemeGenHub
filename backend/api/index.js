// Import the Express app
const app = require("../dist/server").default;

// Export a serverless function handler
module.exports = (req, res) => {
  // Forward the request to the Express app
  return app(req, res);
};
