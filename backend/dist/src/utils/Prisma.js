"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
const globalForPrisma = globalThis;
let logOptions = ['error'];
if (process.env.NODE_ENV === 'development') {
    logOptions = ['error', 'warn'];
}
else {
    logOptions = ['error'];
}
let prismaClientInstance;
if (globalForPrisma.prisma) {
    prismaClientInstance = globalForPrisma.prisma;
}
else {
    prismaClientInstance = new client_1.PrismaClient({
        log: logOptions,
    });
}
exports.prisma = prismaClientInstance;
if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = exports.prisma;
}
