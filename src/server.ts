
import 'dotenv/config';
import express, { NextFunction, Request, Response } from 'express';
import { errormiddleware } from './middleware/error.middleware';
import cors from 'cors';
import { corsOptions } from './configs/cors.config';

const PORT: number = parseInt(process.env.PORT || '8002');
const API_PREFIX: string = process.env.API_PREFIX || '/api/v1';

const app = express();

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Routes
app.get(`${API_PREFIX}/health`, (req: Request, res: Response) => {
    res.status(200).json({
        success: true,
        message: 'Sport Venue Booking API is running'
    });
});

// Centralized Error
app.use(errormiddleware);

// Start Server
if (process.env.NODE_ENV === 'DEVELOPMENT') {
    app.listen(PORT, () => {
        console.log(`Application Running on port: ${PORT}`);
        console.log(`Health check: http://localhost:${PORT}${API_PREFIX}/health`);
    });
}

export default app;
