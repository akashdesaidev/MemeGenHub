// Health check endpoint that doesn't depend on the Express app
module.exports = (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "API is running",
    serverless: true,
    timestamp: new Date().toISOString(),
  });
};
