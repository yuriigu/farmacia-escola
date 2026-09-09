"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizeRoles = authorizeRoles;
exports.requirePermission = requirePermission;
function authorizeRoles(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ error: 'Não autenticado' });
            return;
        }
        if (!allowedRoles.includes(req.user.role)) {
            res.status(403).json({ error: 'Acesso negado para este perfil de usuário' });
            return;
        }
        next();
        return;
    };
}
function requirePermission(permissionKey) {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ error: 'Não autenticado' });
            return;
        }
        if (req.user.role === 'ADMIN') {
            next();
            return;
        }
        else {
            if (req.user.role === 'FARMACEUTICO') {
                next();
                return;
            }
        }
        if (req.user.role === 'MEDICO') {
            if (permissionKey === 'patients') {
                next();
                return;
            }
        }
        if (req.user.role === 'ALUNO') {
            const perms = req.user.permissions;
            if (perms) {
                if (perms[permissionKey] === true) {
                    next();
                    return;
                }
            }
        }
        res.status(403).json({ error: `Sem permissão de acesso ao recurso: ${permissionKey}` });
        return;
    };
}
