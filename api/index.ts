import type { Request, Response } from 'express';
import { createNestApp } from '../src/bootstrap';

export default async (req: Request, res: Response) => {
  const app = await createNestApp();
  app(req, res);
};
