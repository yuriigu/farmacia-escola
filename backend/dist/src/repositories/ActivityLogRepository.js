"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivityLogRepository = void 0;
const Prisma_1 = require("../utils/Prisma");
class ActivityLogRepository {
    async create(data) {
        return Prisma_1.prisma.activityLog.create({
            data: {
                userId: data.userId,
                action: data.action,
                entity: data.entity,
                entityId: data.entityId ?? null,
                details: data.details ?? null,
            },
        });
    }
    async findMany(filters) {
        const where = {};
        if (filters.userId)
            where.userId = filters.userId;
        if (filters.entity)
            where.entity = filters.entity;
        const [logs, total] = await Promise.all([
            Prisma_1.prisma.activityLog.findMany({
                where,
                include: {
                    user: { select: { id: true, name: true, role: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip: filters.skip ?? 0,
                take: filters.take ?? 50,
            }),
            Prisma_1.prisma.activityLog.count({ where }),
        ]);
        return { logs, total };
    }
    async findById(id) {
        return Prisma_1.prisma.activityLog.findUnique({
            where: { id },
            include: {
                user: { select: { id: true, name: true, role: true } },
            },
        });
    }
}
exports.ActivityLogRepository = ActivityLogRepository;
