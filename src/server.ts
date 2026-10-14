import 'dotenv/config';
import express, { NextFunction, Request, Response } from 'express';
import { CorsOptions } from 'cors';
import { errormiddleware } from './middleware/error.middleware';

const PORT: number = parseInt(process.env.PORT!);
const API_PREFIX: string = process.env.API_PREFIX!;
const app = express();



app.use(cors(Corsoption))
app.use(express.json())

/* Centralized Error */
app.use(errormiddleware);

app.listen(PORT, () => {
  console.log(`Application Running on PORT: ${PORT}`);
});