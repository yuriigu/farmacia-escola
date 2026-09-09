"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const AuthService_1 = require("../services/AuthService");
const ValidationMiddleware_1 = require("../middlewares/ValidationMiddleware");
class AuthController {
    authService;
    constructor() {
        this.authService = new AuthService_1.AuthService();
    }
    login = async (req, res) => {
        try {
            const validationResult = ValidationMiddleware_1.loginSchema.safeParse(req.body);
            if (!validationResult.success) {
                let errorMsg = 'Dados inválidos na requisição';
                if (validationResult.error) {
                    if (validationResult.error.issues) {
                        if (validationResult.error.issues.length > 0) {
                            const firstIssue = validationResult.error.issues[0];
                            if (firstIssue) {
                                if (firstIssue.message) {
                                    errorMsg = firstIssue.message;
                                }
                            }
                        }
                    }
                }
                res.status(400).json({ error: errorMsg, details: validationResult.error.issues });
                return;
            }
            const email = validationResult.data.email;
            const password = validationResult.data.password;
            const result = await this.authService.login(email, password);
            res.json(result);
            return;
        }
        catch (err) {
            if (err.statusCode) {
                res.status(err.statusCode).json({ error: err.message });
                return;
            }
            else {
                res.status(500).json({ error: 'Erro ao efetuar login' });
                return;
            }
        }
    };
    register = async (req, res) => {
        try {
            const validationResult = ValidationMiddleware_1.registerPatientSchema.safeParse(req.body);
            if (!validationResult.success) {
                let errorMsg = 'Dados inválidos na requisição';
                if (validationResult.error) {
                    if (validationResult.error.issues) {
                        if (validationResult.error.issues.length > 0) {
                            const firstIssue = validationResult.error.issues[0];
                            if (firstIssue) {
                                if (firstIssue.message) {
                                    errorMsg = firstIssue.message;
                                }
                            }
                        }
                    }
                }
                res.status(400).json({ error: errorMsg, details: validationResult.error.issues });
                return;
            }
            const result = await this.authService.registerPatient(validationResult.data);
            res.status(201).json(result);
            return;
        }
        catch (err) {
            if (err.statusCode) {
                res.status(err.statusCode).json({ error: err.message });
                return;
            }
            else {
                res.status(500).json({ error: 'Erro ao registrar paciente' });
                return;
            }
        }
    };
    me = async (req, res) => {
        try {
            if (!req.user) {
                res.status(401).json({ error: 'Não autenticado' });
                return;
            }
            const profile = await this.authService.getProfile(req.user.userId);
            res.json(profile);
            return;
        }
        catch (err) {
            if (err.statusCode) {
                res.status(err.statusCode).json({ error: err.message });
                return;
            }
            else {
                res.status(500).json({ error: 'Erro ao buscar dados do usuário' });
                return;
            }
        }
    };
    updateProfile = async (req, res) => {
        try {
            if (!req.user) {
                res.status(401).json({ error: 'Não autenticado' });
                return;
            }
            const validationResult = ValidationMiddleware_1.updateProfileSchema.safeParse(req.body);
            if (!validationResult.success) {
                let errorMsg = 'Dados inválidos na requisição';
                if (validationResult.error) {
                    if (validationResult.error.issues) {
                        if (validationResult.error.issues.length > 0) {
                            const firstIssue = validationResult.error.issues[0];
                            if (firstIssue) {
                                if (firstIssue.message) {
                                    errorMsg = firstIssue.message;
                                }
                            }
                        }
                    }
                }
                res.status(400).json({ error: errorMsg, details: validationResult.error.issues });
                return;
            }
            const result = await this.authService.updateProfile(req.user.userId, validationResult.data);
            res.json(result);
            return;
        }
        catch (err) {
            if (err.statusCode) {
                res.status(err.statusCode).json({ error: err.message });
                return;
            }
            else {
                res.status(500).json({ error: 'Erro ao atualizar perfil' });
                return;
            }
        }
    };
}
exports.AuthController = AuthController;
