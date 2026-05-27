import { Router, Request, Response } from 'express';
import { modelRegistry } from '../config/models.config.js';

export const modelsRouter = Router();

modelsRouter.get('/', (req: Request, res: Response) => {
  try {
    const models = modelRegistry.getAll();
    res.json(models);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
