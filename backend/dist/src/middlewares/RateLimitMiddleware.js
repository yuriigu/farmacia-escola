"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalRateLimiter = exports.authRateLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
let isTestEnv = false;
if (process.env.NODE_ENV === 'test') {
    isTestEnv = true;
}
else {
    isTestEnv = false;
}
let authMax = 10;
if (isTestEnv) {
    authMax = 1000;
}
else {
    authMax = 10;
}
exports.authRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: authMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'Muitas tentativas de autenticação. Tente novamente mais tarde.',
    },
});
let apiMax = 300;
if (isTestEnv) {
    apiMax = 5000;
}
else {
    apiMax = 300;
}
exports.globalRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: apiMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'Muitas requisições. Tente novamente mais tarde.',
    },
});
