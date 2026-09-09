"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorMiddleware = errorMiddleware;
function errorMiddleware(err, req, res, _next) {
    console.error('Unhandled API Error:', err);
    let statusCode = 500;
    if (err.statusCode) {
        statusCode = err.statusCode;
    }
    else {
        if (err.status) {
            statusCode = Number(err.status);
        }
        else {
            statusCode = 500;
        }
    }
    let message = 'Erro interno no servidor';
    if (err.message) {
        message = err.message;
    }
    else {
        message = 'Erro interno no servidor';
    }
    if (process.env.NODE_ENV === 'development') {
        res.status(statusCode).json({
            error: message,
            stack: err.stack,
        });
        return;
    }
    else {
        res.status(statusCode).json({
            error: message,
        });
        return;
    }
}
