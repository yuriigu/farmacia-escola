"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const Index_1 = __importDefault(require("./routes/Index"));
const ErrorMiddleware_1 = require("./middlewares/ErrorMiddleware");
const RateLimitMiddleware_1 = require("./middlewares/RateLimitMiddleware");
dotenv_1.default.config();
const app = (0, express_1.default)();
let PORT = 3001;
if (process.env.PORT) {
    PORT = Number(process.env.PORT);
}
else {
    PORT = 3001;
}
let frontendUrl = 'http://localhost:3000';
if (process.env.FRONTEND_URL) {
    frontendUrl = process.env.FRONTEND_URL;
}
else {
    frontendUrl = 'http://localhost:3000';
}
const allowedOrigins = frontendUrl.split(',');
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin) {
            callback(null, true);
            return;
        }
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
            return;
        }
        else {
            if (process.env.NODE_ENV === 'development') {
                callback(null, true);
                return;
            }
        }
        callback(new Error('Origem não permitida pelo CORS'));
        return;
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express_1.default.json());
app.use('/api', RateLimitMiddleware_1.globalRateLimiter);
app.use('/api', Index_1.default);
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
    return;
});
app.use(ErrorMiddleware_1.errorMiddleware);
let isTesting = false;
if (process.env.NODE_ENV === 'test') {
    isTesting = true;
}
else {
    isTesting = false;
}
if (!isTesting) {
    app.listen(PORT, () => {
        console.log(`[API] Servidor Express iniciado em http://localhost:${PORT}`);
    });
}
exports.default = app;
