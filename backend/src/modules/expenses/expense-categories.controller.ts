import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/prisma';
import { sendSuccess, sendCreated, sendNotFound, sendError } from '../../utils/response';

export async function getCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const categories = await prisma.expenseCategory.findMany({
      orderBy: { name: 'asc' }
    });
    sendSuccess(res, categories);
  } catch (err) { next(err); }
}

export async function createCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name } = req.body;
    if (!name) { sendError(res, 'Name is required', 400); return; }

    const category = await prisma.expenseCategory.create({
      data: { name }
    });
    sendCreated(res, category, 'Category created');
  } catch (err: any) {
    if (err.code === 'P2002') { sendError(res, 'Category already exists', 400); return; }
    next(err);
  }
}

export async function updateCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name } = req.body;
    const category = await prisma.expenseCategory.update({
      where: { id: req.params.id },
      data: { name }
    });
    sendSuccess(res, category, 200, undefined, 'Category updated');
  } catch (err: any) {
    if (err.code === 'P2002') { sendError(res, 'Category name already exists', 400); return; }
    next(err);
  }
}

export async function deleteCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await prisma.expenseCategory.delete({ where: { id: req.params.id } });
    sendSuccess(res, null, 200, undefined, 'Category deleted');
  } catch (err) { next(err); }
}
