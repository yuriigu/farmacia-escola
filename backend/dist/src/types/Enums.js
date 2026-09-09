"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DosageUnit = exports.StockStatus = exports.AppointmentStatus = exports.Role = void 0;
exports.Role = {
    ADMIN: 'ADMIN',
    FARMACEUTICO: 'FARMACEUTICO',
    MEDICO: 'MEDICO',
    ALUNO: 'ALUNO',
    PACIENTE: 'PACIENTE',
};
exports.AppointmentStatus = {
    PENDING: 'PENDING',
    CONFIRMED: 'CONFIRMED',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED',
};
exports.StockStatus = {
    BLOCKED: 'BLOCKED',
    CRITICAL_EXPIRATION: 'CRITICAL_EXPIRATION',
    EXPIRED: 'EXPIRED',
    OUT_OF_STOCK: 'OUT_OF_STOCK',
    IN_STOCK: 'IN_STOCK',
};
exports.DosageUnit = {
    MG: 'MG',
    ML: 'ML',
    G: 'G',
    MCG: 'MCG',
    UI: 'UI',
};
