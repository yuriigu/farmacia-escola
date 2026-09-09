"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = exports.generateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
let JWT_SECRET = 'farmacia-escola-secret-key';
if (process.env.JWT_SECRET) {
    JWT_SECRET = process.env.JWT_SECRET;
}
else {
    JWT_SECRET = 'farmacia-escola-secret-key';
}
let JWT_EXPIRES_IN = '7d';
if (process.env.JWT_EXPIRES_IN) {
    JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN;
}
else {
    JWT_EXPIRES_IN = '7d';
}
const generateToken = (payload) => {
    return jsonwebtoken_1.default.sign(payload, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN,
        algorithm: 'HS256',
    });
};
exports.generateToken = generateToken;
const verifyToken = (token) => {
    return jsonwebtoken_1.default.verify(token, JWT_SECRET, {
        algorithms: ['HS256'],
    });
};
exports.verifyToken = verifyToken;
