import 'dotenv/config';
import express, { NextFunction, Request, Response } from 'express';
import { errormiddleware } from './middleware/error.middleware';
import cors from 'cors'
import { corsOptions } from './configs/cors.config';
const PORT: number = parseInt(process.env.PORT!);
const API_PREFIX: string = process.env.API_PREFIX!;
const app = express();



app.use(cors(corsOptions));
app.use(express.json());

/* Centralized Error */
app.use(errormiddleware);


if (process.env.NODE_ENV === 'DEVELOPMENT')
    app.listen(PORT,() => {
        console.log(`Application Runing on port: ${PORT}`)
});

export default app;