// src/lambda.ts

import serverless from 'serverless-http';
import app from './app';

// Wrap express app
export const handler = serverless(app);