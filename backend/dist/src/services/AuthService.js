"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const UserRepository_1 = require("../repositories/UserRepository");
const PatientRepository_1 = require("../repositories/PatientRepository");
const Jwt_1 = require("../utils/Jwt");
const Prisma_1 = require("../utils/Prisma");
const Enums_1 = require("../types/Enums");
class AuthService {
    userRepo;
    patientRepo;
    constructor() {
        this.userRepo = new UserRepository_1.UserRepository();
        this.patientRepo = new PatientRepository_1.PatientRepository();
    }
    isValidCPF(cpf) {
        const digits = cpf.replace(/\D/g, '');
        return digits.length === 11;
    }
    async login(email, password) {
        if (!email) {
            throw { statusCode: 400, message: 'Email e senha são obrigatórios' };
        }
        else {
            if (!password) {
                throw { statusCode: 400, message: 'Email e senha são obrigatórios' };
            }
        }
        const user = await this.userRepo.findByEmail(email);
        if (!user) {
            await bcryptjs_1.default.compare(password, '$2a$12$e8uq0wG64.gL1iZqBv1Yy.x38yvTq3kHek4vD3lO0G7Xm3z3T2O6m');
            throw { statusCode: 401, message: 'Credenciais inválidas' };
        }
        else {
            if (!user.active) {
                let userHash = '$2a$12$e8uq0wG64.gL1iZqBv1Yy.x38yvTq3kHek4vD3lO0G7Xm3z3T2O6m';
                if (user.password) {
                    userHash = user.password;
                }
                else {
                    userHash = '$2a$12$e8uq0wG64.gL1iZqBv1Yy.x38yvTq3kHek4vD3lO0G7Xm3z3T2O6m';
                }
                await bcryptjs_1.default.compare(password, userHash);
                throw { statusCode: 401, message: 'Credenciais inválidas' };
            }
        }
        const valid = await bcryptjs_1.default.compare(password, user.password);
        if (!valid) {
            throw { statusCode: 401, message: 'Credenciais inválidas' };
        }
        let userPatientId = null;
        if (user.patient) {
            userPatientId = user.patient.id;
        }
        else {
            userPatientId = null;
        }
        const token = (0, Jwt_1.generateToken)({
            userId: user.id,
            role: user.role,
            email: user.email,
            patientId: userPatientId,
        });
        const { password: _, ...userWithoutPassword } = user;
        return {
            token,
            user: {
                ...userWithoutPassword,
                patientId: userPatientId,
            },
        };
    }
    async registerPatient(data) {
        const { name, email, password, cpf, phone, birthDate, address } = data;
        if (!name) {
            throw { statusCode: 400, message: 'Nome, email, senha e CPF são obrigatórios' };
        }
        else {
            if (!email) {
                throw { statusCode: 400, message: 'Nome, email, senha e CPF são obrigatórios' };
            }
            else {
                if (!password) {
                    throw { statusCode: 400, message: 'Nome, email, senha e CPF são obrigatórios' };
                }
                else {
                    if (!cpf) {
                        throw { statusCode: 400, message: 'Nome, email, senha e CPF são obrigatórios' };
                    }
                }
            }
        }
        if (!this.isValidCPF(cpf)) {
            throw { statusCode: 400, message: 'CPF inválido' };
        }
        const existingUser = await this.userRepo.findByEmail(email);
        let hasConflict = false;
        if (existingUser) {
            hasConflict = true;
        }
        else {
            hasConflict = false;
        }
        const existingPatient = await this.patientRepo.findByCpf(cpf);
        if (existingPatient) {
            hasConflict = true;
        }
        if (hasConflict) {
            throw { statusCode: 409, message: 'Dados cadastrais já em uso ou inválidos' };
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 12);
        const user = await Prisma_1.prisma.$transaction(async (tx) => {
            const newUser = await tx.user.create({
                data: {
                    name,
                    email,
                    password: hashedPassword,
                    role: Enums_1.Role.PACIENTE,
                    phone,
                },
                include: { patient: true },
            });
            let birthDateObj = null;
            if (birthDate) {
                birthDateObj = new Date(birthDate);
            }
            else {
                birthDateObj = null;
            }
            const patient = await tx.patient.create({
                data: {
                    name,
                    cpf,
                    phone,
                    birthDate: birthDateObj,
                    address,
                    userId: newUser.id,
                },
            });
            return { ...newUser, patient };
        });
        let newPatientId = null;
        if (user.patient) {
            newPatientId = user.patient.id;
        }
        else {
            newPatientId = null;
        }
        const token = (0, Jwt_1.generateToken)({
            userId: user.id,
            role: user.role,
            email: user.email,
            patientId: newPatientId,
        });
        const { password: _, ...userWithoutPassword } = user;
        return {
            token,
            user: {
                ...userWithoutPassword,
                patientId: newPatientId,
            },
        };
    }
    async getProfile(userId) {
        const user = await this.userRepo.findById(userId);
        if (!user) {
            throw { statusCode: 404, message: 'Usuário não encontrado' };
        }
        let userPatientId = null;
        if (user.patient) {
            userPatientId = user.patient.id;
        }
        else {
            userPatientId = null;
        }
        const { password: _, ...userWithoutPassword } = user;
        return {
            ...userWithoutPassword,
            patientId: userPatientId,
        };
    }
    async updateProfile(userId, data) {
        const user = await this.userRepo.findById(userId);
        if (!user) {
            throw { statusCode: 404, message: 'Usuário não encontrado' };
        }
        const updateData = {};
        if (data.name) {
            updateData.name = data.name;
        }
        if (data.phone !== undefined) {
            updateData.phone = data.phone;
        }
        if (data.newPassword) {
            if (!data.currentPassword) {
                throw { statusCode: 400, message: 'Senha atual é obrigatória para alterar a senha' };
            }
            const valid = await bcryptjs_1.default.compare(data.currentPassword, user.password);
            if (!valid) {
                throw { statusCode: 400, message: 'Senha atual incorreta' };
            }
            updateData.password = await bcryptjs_1.default.hash(data.newPassword, 12);
        }
        const updated = await this.userRepo.update(userId, updateData);
        const { password: _, ...userWithoutPassword } = updated;
        let userPatientId = null;
        if (user.patient) {
            userPatientId = user.patient.id;
        }
        else {
            userPatientId = null;
        }
        return {
            message: 'Perfil atualizado com sucesso',
            user: {
                ...userWithoutPassword,
                patientId: userPatientId,
            },
        };
    }
}
exports.AuthService = AuthService;
