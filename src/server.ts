
import 'dotenv/config';
import express, { NextFunction, Request, Response } from 'express';
import { errormiddleware } from './middleware/error.middleware';
import cors from 'cors';
import { corsOptions } from './configs/cors.config';
import AuthRoute from './features/auth/auth.routes';
import cookieParser from 'cookie-parser';

const PORT = parseInt(process.env.PORT || '8002', 10);
const API_PREFIX = process.env.API_PREFIX || '/api/v1';

const app = express();
app.use((req, res, next) => {
  console.log("[SERVER HIT]", req.method, req.originalUrl);
  next();
});

// Middleware
app.use((req, res, next) => {
  console.log("[SERVER HIT]", req.method, req.originalUrl);
  next();
});
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

// Logger: letakkan sebelum routes
app.use((req, res, next) => {
  console.log('[REQUEST MASUK]', req.method, req.originalUrl);
  next();
});

// Health check
app.get(`${API_PREFIX}/health`, (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Sport Venue Booking API is running',
  });
});

// Routes
app.use(API_PREFIX, AuthRoute);

// Centralized Error
app.use(errormiddleware);
console.log("### SPORT VENUE BACKEND DEBUG V1 ###");

// Start server
app.listen(PORT, () => {
  console.log(`Application Running on port: ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}${API_PREFIX}/health`);
});

export default app;
