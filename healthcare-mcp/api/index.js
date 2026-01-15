// Vercel Serverless Function Entry Point
// This wraps the Express app for Vercel's serverless environment

// Set environment variable to prevent auto-start
process.env.NO_AUTO_START = "true";

import app from "../dist/index.js";

export default app;
