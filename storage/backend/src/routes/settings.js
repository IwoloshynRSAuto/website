import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// ====================
// STORAGE LOCATIONS
// ====================

router.get('/locations', async (req, res, next) => {
    try {
        const locations = await prisma.storageLocation.findMany({
            where: { isActive: true },
            orderBy: { code: 'asc' }
        });
        res.json({ success: true, data: locations });
    } catch (error) {
        next(error);
    }
});

router.post('/locations', async (req, res, next) => {
    try {
        const { code, name, description } = req.body;
        const location = await prisma.storageLocation.create({
            data: { code, name, description }
        });
        res.status(201).json({ success: true, data: location });
    } catch (error) {
        next(error);
    }
});

router.put('/locations/:id', async (req, res, next) => {
    try {
        const { code, name, description, isActive } = req.body;
        const location = await prisma.storageLocation.update({
            where: { id: parseInt(req.params.id) },
            data: { code, name, description, isActive }
        });
        res.json({ success: true, data: location });
    } catch (error) {
        next(error);
    }
});

router.delete('/locations/:id', async (req, res, next) => {
    try {
        await prisma.storageLocation.update({
            where: { id: parseInt(req.params.id) },
            data: { isActive: false }
        });
        res.json({ success: true, message: 'Location deactivated' });
    } catch (error) {
        next(error);
    }
});

// ====================
// CONDITIONS
// ====================

router.get('/conditions', async (req, res, next) => {
    try {
        const conditions = await prisma.condition.findMany({
            where: { isActive: true },
            orderBy: { name: 'asc' }
        });
        res.json({ success: true, data: conditions });
    } catch (error) {
        next(error);
    }
});

router.post('/conditions', async (req, res, next) => {
    try {
        const { code, name, description, multiplier } = req.body;
        const condition = await prisma.condition.create({
            data: {
                code,
                name,
                description,
                multiplier: multiplier ? parseFloat(multiplier) : 1.0
            }
        });
        res.status(201).json({ success: true, data: condition });
    } catch (error) {
        next(error);
    }
});

router.put('/conditions/:id', async (req, res, next) => {
    try {
        const { code, name, description, multiplier, isActive } = req.body;
        const condition = await prisma.condition.update({
            where: { id: parseInt(req.params.id) },
            data: {
                code,
                name,
                description,
                multiplier: multiplier ? parseFloat(multiplier) : undefined,
                isActive
            }
        });
        res.json({ success: true, data: condition });
    } catch (error) {
        next(error);
    }
});

router.delete('/conditions/:id', async (req, res, next) => {
    try {
        await prisma.condition.update({
            where: { id: parseInt(req.params.id) },
            data: { isActive: false }
        });
        res.json({ success: true, message: 'Condition deactivated' });
    } catch (error) {
        next(error);
    }
});

// ====================
// CATEGORIES
// ====================

router.get('/categories', async (req, res, next) => {
    try {
        const categories = await prisma.category.findMany({
            where: { isActive: true },
            orderBy: { name: 'asc' }
        });
        res.json({ success: true, data: categories });
    } catch (error) {
        next(error);
    }
});

router.post('/categories', async (req, res, next) => {
    try {
        const { code, name, parentId, ebayId } = req.body;
        const category = await prisma.category.create({
            data: {
                code,
                name,
                parentId: parentId ? parseInt(parentId) : null,
                ebayId
            }
        });
        res.status(201).json({ success: true, data: category });
    } catch (error) {
        next(error);
    }
});

router.put('/categories/:id', async (req, res, next) => {
    try {
        const { code, name, parentId, ebayId, isActive } = req.body;
        const category = await prisma.category.update({
            where: { id: parseInt(req.params.id) },
            data: {
                code,
                name,
                parentId: parentId ? parseInt(parentId) : null,
                ebayId,
                isActive
            }
        });
        res.json({ success: true, data: category });
    } catch (error) {
        next(error);
    }
});

router.delete('/categories/:id', async (req, res, next) => {
    try {
        await prisma.category.update({
            where: { id: parseInt(req.params.id) },
            data: { isActive: false }
        });
        res.json({ success: true, message: 'Category deactivated' });
    } catch (error) {
        next(error);
    }
});

export default router;
