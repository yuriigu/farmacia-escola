"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const UserRepository_1 = require("../repositories/UserRepository");
const ActivityLogService_1 = require("./ActivityLogService");
const Enums_1 = require("../types/Enums");
class UserService {
    userRepo;
    logService;
    emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    constructor() {
        this.userRepo = new UserRepository_1.UserRepository();
        this.logService = new ActivityLogService_1.ActivityLogService();
    }
    sanitizeUser(user) {
        const { password, ...userWithoutPassword } = user;
        let rawBirthDate = null;
        if (user.birthDate) {
            rawBirthDate = user.birthDate;
        }
        else {
            if (user.patient) {
                if (user.patient.birthDate) {
                    rawBirthDate = user.patient.birthDate;
                }
                else {
                    rawBirthDate = null;
                }
            }
            else {
                rawBirthDate = null;
            }
        }
        let address = null;
        if (user.address) {
            address = user.address;
        }
        else {
            if (user.patient) {
                if (user.patient.address) {
                    address = user.patient.address;
                }
                else {
                    address = null;
                }
            }
            else {
                address = null;
            }
        }
        let birthDateStr = null;
        if (rawBirthDate) {
            if (typeof rawBirthDate === 'string') {
                birthDateStr = rawBirthDate.split('T')[0];
            }
            else if (rawBirthDate instanceof Date && !isNaN(rawBirthDate.getTime())) {
                birthDateStr = rawBirthDate.toISOString().split('T')[0];
            }
        }
        return {
            ...userWithoutPassword,
            birthDate: birthDateStr,
            address: address,
        };
    }
    validateEmail(email) {
        if (!this.emailRegex.test(email)) {
            throw { statusCode: 400, message: 'Formato de email inválido' };
        }
    }
    validatePassword(password) {
        if (password.length < 6) {
            throw { statusCode: 400, message: 'A senha deve ter pelo menos 6 caracteres' };
        }
    }
    async getAllUsers() {
        const users = await this.userRepo.findAll();
        return users.map((user) => this.sanitizeUser(user));
    }
    async getUserById(id) {
        const user = await this.userRepo.findById(id);
        if (!user) {
            throw { statusCode: 404, message: 'Usuário não encontrado' };
        }
        return this.sanitizeUser(user);
    }
    async createUser(adminId, data) {
        let cleanName = '';
        if (data.name) {
            cleanName = data.name.trim();
        }
        else {
            cleanName = '';
        }
        let cleanEmail = '';
        if (data.email) {
            cleanEmail = data.email.trim().toLowerCase();
        }
        else {
            cleanEmail = '';
        }
        if (!cleanName) {
            throw { statusCode: 400, message: 'Nome, email, senha e perfil são obrigatórios' };
        }
        else {
            if (!cleanEmail) {
                throw { statusCode: 400, message: 'Nome, email, senha e perfil são obrigatórios' };
            }
            else {
                if (!data.password) {
                    throw { statusCode: 400, message: 'Nome, email, senha e perfil são obrigatórios' };
                }
                else {
                    if (!data.role) {
                        throw { statusCode: 400, message: 'Nome, email, senha e perfil são obrigatórios' };
                    }
                }
            }
        }
        this.validateEmail(cleanEmail);
        this.validatePassword(data.password);
        const existing = await this.userRepo.findByEmail(cleanEmail);
        if (existing) {
            throw { statusCode: 409, message: 'Email já cadastrado' };
        }
        let phoneVal = null;
        if (data.phone) {
            phoneVal = data.phone.trim();
        }
        else {
            phoneVal = null;
        }
        let registerDocVal = null;
        if (data.registerDoc) {
            registerDocVal = data.registerDoc.trim();
        }
        else {
            registerDocVal = null;
        }
        let addressVal = null;
        if (data.address) {
            addressVal = data.address.trim();
        }
        else {
            addressVal = null;
        }
        let birthDateVal = null;
        if (data.birthDate) {
            birthDateVal = data.birthDate;
        }
        else {
            birthDateVal = null;
        }
        let permissionsVal = undefined;
        if (data.role === Enums_1.Role.ALUNO) {
            permissionsVal = data.permissions;
        }
        else {
            permissionsVal = undefined;
        }
        const hashedPassword = await bcryptjs_1.default.hash(data.password, 12);
        const user = await this.userRepo.create({
            ...data,
            name: cleanName,
            email: cleanEmail,
            phone: phoneVal,
            registerDoc: registerDocVal,
            address: addressVal,
            birthDate: birthDateVal,
            password: hashedPassword,
            permissions: permissionsVal,
        });
        await this.logService.log(adminId, 'create', 'users', user.id, `Criou usuário ${user.name} (${user.role})`);
        return this.sanitizeUser(user);
    }
    async updateUser(adminId, id, data) {
        const user = await this.userRepo.findById(id);
        if (!user) {
            throw { statusCode: 404, message: 'Usuário não encontrado' };
        }
        const updateData = {};
        if (data.name !== undefined) {
            const cleanName = data.name.trim();
            if (!cleanName) {
                throw { statusCode: 400, message: 'Nome não pode ser vazio' };
            }
            updateData.name = cleanName;
        }
        if (data.email !== undefined) {
            const cleanEmail = data.email.trim().toLowerCase();
            this.validateEmail(cleanEmail);
            if (cleanEmail !== user.email) {
                const emailOccupied = await this.userRepo.findByEmail(cleanEmail);
                if (emailOccupied) {
                    throw { statusCode: 409, message: 'Email já cadastrado para outro usuário' };
                }
            }
            updateData.email = cleanEmail;
        }
        if (data.password !== undefined) {
            if (data.password.trim() !== '') {
                this.validatePassword(data.password);
                updateData.password = await bcryptjs_1.default.hash(data.password, 12);
            }
        }
        if (data.role !== undefined) {
            updateData.role = data.role;
        }
        if (data.phone !== undefined) {
            let updatePhone = null;
            if (data.phone) {
                updatePhone = data.phone.trim();
            }
            else {
                updatePhone = null;
            }
            updateData.phone = updatePhone;
        }
        if (data.registerDoc !== undefined) {
            let updateRegisterDoc = null;
            if (data.registerDoc) {
                updateRegisterDoc = data.registerDoc.trim();
            }
            else {
                updateRegisterDoc = null;
            }
            updateData.registerDoc = updateRegisterDoc;
        }
        if (data.address !== undefined) {
            let updateAddress = null;
            if (data.address) {
                updateAddress = data.address.trim();
            }
            else {
                updateAddress = null;
            }
            updateData.address = updateAddress;
        }
        if (data.birthDate !== undefined) {
            let updateBirthDate = null;
            if (data.birthDate) {
                updateBirthDate = data.birthDate;
            }
            else {
                updateBirthDate = null;
            }
            updateData.birthDate = updateBirthDate;
        }
        if (data.active !== undefined) {
            updateData.active = Boolean(data.active);
        }
        if (data.permissions !== undefined) {
            updateData.permissions = data.permissions;
        }
        const updated = await this.userRepo.update(id, updateData);
        await this.logService.log(adminId, 'update', 'users', id, `Atualizou usuário ${updated.name}`);
        return this.sanitizeUser(updated);
    }
    async toggleActive(adminId, id, active) {
        const user = await this.userRepo.findById(id);
        if (!user) {
            throw { statusCode: 404, message: 'Usuário não encontrado' };
        }
        const updated = await this.userRepo.update(id, { active: Boolean(active) });
        let actionLog = 'deactivate';
        let actionMessage = 'Desativou';
        if (active) {
            actionLog = 'activate';
            actionMessage = 'Ativou';
        }
        else {
            actionLog = 'deactivate';
            actionMessage = 'Desativou';
        }
        await this.logService.log(adminId, actionLog, 'users', id, `${actionMessage} usuário ${updated.name}`);
        return this.sanitizeUser(updated);
    }
    async deleteUser(adminId, id) {
        if (adminId === id) {
            throw { statusCode: 400, message: 'Um administrador não pode excluir a própria conta' };
        }
        const user = await this.userRepo.findById(id);
        if (!user) {
            throw { statusCode: 404, message: 'Usuário não encontrado' };
        }
        await this.userRepo.delete(id);
        await this.logService.log(adminId, 'delete', 'users', id, `Excluiu usuário ${user.name}`);
        return { message: 'Usuário excluído com sucesso' };
    }
}
exports.UserService = UserService;
