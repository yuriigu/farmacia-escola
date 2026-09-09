"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
const Jwt_1 = require("../utils/Jwt");
const Prisma_1 = require("../utils/Prisma");
async function authMiddleware(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            res.status(401).json({ error: 'Token de autenticação não fornecido' });
            return;
        }
        else {
            if (!authHeader.startsWith('Bearer ')) {
                res.status(401).json({ error: 'Token de autenticação não fornecido' });
                return;
            }
        }
        const token = authHeader.split(' ')[1];
        const decoded = (0, Jwt_1.verifyToken)(token);
        const user = await Prisma_1.prisma.user.findUnique({
            where: { id: decoded.userId },
            select: { id: true, role: true, active: true, permissions: true, email: true, patient: { select: { id: true } } },
        });
        if (!user) {
            res.status(401).json({ error: 'Usuário inativo ou inexistente' });
            return;
        }
        else {
            if (!user.active) {
                res.status(401).json({ error: 'Usuário inativo ou inexistente' });
                return;
            }
        }
        let patientId = null;
        if (user.patient) {
            patientId = user.patient.id;
        }
        else {
            patientId = null;
        }
        req.user = {
            userId: user.id,
            role: user.role,
            email: user.email,
            patientId: patientId,
            permissions: user.permissions,
        };
        next();
        return;
    }
    catch {
        res.status(401).json({ error: 'Token inválido ou expirado' });
        return;
    }
}
