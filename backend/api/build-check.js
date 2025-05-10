// Simple API endpoint to verify Vercel build and deployment
module.exports = (req, res) => {
  res.status(200).json({
    message: "Vercel deployment is working!",
    time: new Date().toISOString(),
    nodeVersion: process.version,
    env: process.env.NODE_ENV || "unknown",
  });
};
