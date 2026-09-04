import { prisma } from '../utils/Prisma';
import { Role } from '../types/Enums';

export class UserRepository {
  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
      include: { patient: true },
    });
  }

  async findById(id: number) {
    return prisma.user.findUnique({
      where: { id },
      include: { patient: true },
    });
  }

  async findAll() {
    return prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        registerDoc: true,
        phone: true,
        active: true,
        permissions: true,
        createdAt: true,
        patient: {
          select: {
            id: true,
            cpf: true,
            birthDate: true,
            address: true,
            phone: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async create(data: {
    name: string;
    email: string;
    password: string;
    role: Role;
    registerDoc?: string | null;
    phone?: string | null;
    permissions?: any;
    birthDate?: string | Date | null;
    address?: string | null;
  }) {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: data.name,
          email: data.email,
          password: data.password,
          role: data.role,
          registerDoc: data.registerDoc,
          phone: data.phone,
          permissions: data.permissions,
        },
      });

      let patient = null;
      let shouldCreatePatient = false;
      if (data.birthDate) {
        shouldCreatePatient = true;
      } else {
        if (data.address) {
          shouldCreatePatient = true;
        } else {
          if (data.role === Role.PACIENTE) {
            shouldCreatePatient = true;
          } else {
            shouldCreatePatient = false;
          }
        }
      }

      if (shouldCreatePatient) {
        let cpfValue = '';
        if (data.registerDoc) {
          cpfValue = data.registerDoc.replace(/\D/g, '');
        } else {
          cpfValue = '';
        }

        let validCpf = '';
        if (cpfValue.length === 11) {
          validCpf = cpfValue;
        } else {
          validCpf = `CPF${user.id}${Date.now().toString().slice(-6)}`;
        }

        let patientBirthDate = null;
        if (data.birthDate) {
          patientBirthDate = new Date(data.birthDate);
        } else {
          patientBirthDate = null;
        }

        patient = await tx.patient.create({
          data: {
            name: data.name,
            cpf: validCpf,
            phone: data.phone,
            birthDate: patientBirthDate,
            address: data.address,
            userId: user.id,
          },
        });
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        registerDoc: user.registerDoc,
        phone: user.phone,
        active: user.active,
        permissions: user.permissions,
        createdAt: user.createdAt,
        patient: patient
          ? {
              id: patient.id,
              cpf: patient.cpf,
              birthDate: patient.birthDate,
              address: patient.address,
              phone: patient.phone,
            }
          : null,
      };
    });
  }

  async update(
    id: number,
    data: {
      name?: string;
      email?: string;
      password?: string;
      role?: Role;
      registerDoc?: string | null;
      phone?: string | null;
      active?: boolean;
      permissions?: any;
      birthDate?: string | Date | null;
      address?: string | null;
    }
  ) {
    return prisma.$transaction(async (tx) => {
      const userUpdateData: any = {};
      if (data.name !== undefined) userUpdateData.name = data.name;
      if (data.email !== undefined) userUpdateData.email = data.email;
      if (data.password !== undefined) userUpdateData.password = data.password;
      if (data.role !== undefined) userUpdateData.role = data.role;
      if (data.registerDoc !== undefined) userUpdateData.registerDoc = data.registerDoc;
      if (data.phone !== undefined) userUpdateData.phone = data.phone;
      if (data.active !== undefined) userUpdateData.active = data.active;
      if (data.permissions !== undefined) userUpdateData.permissions = data.permissions;

      const user = await tx.user.update({
        where: { id },
        data: userUpdateData,
        include: { patient: true },
      });

      let patient = user.patient;

      let hasPatientData = false;
      if (data.birthDate !== undefined) {
        hasPatientData = true;
      } else {
        if (data.address !== undefined) {
          hasPatientData = true;
        } else {
          if (data.name !== undefined) {
            hasPatientData = true;
          } else {
            if (data.phone !== undefined) {
              hasPatientData = true;
            } else {
              if (data.registerDoc !== undefined) {
                hasPatientData = true;
              } else {
                hasPatientData = false;
              }
            }
          }
        }
      }

      if (hasPatientData) {
        if (patient) {
          const patientUpdateData: any = {};
          if (data.name !== undefined) patientUpdateData.name = data.name;
          if (data.phone !== undefined) patientUpdateData.phone = data.phone;
          if (data.address !== undefined) patientUpdateData.address = data.address;
          if (data.birthDate !== undefined) {
            let updateBirthDate = null;
            if (data.birthDate) {
              updateBirthDate = new Date(data.birthDate);
            } else {
              updateBirthDate = null;
            }
            patientUpdateData.birthDate = updateBirthDate;
          }
          if (data.registerDoc !== undefined) {
            if (data.registerDoc) {
              const cleanCpf = data.registerDoc.replace(/\D/g, '');
              if (cleanCpf.length === 11) {
                patientUpdateData.cpf = cleanCpf;
              }
            }
          }
          patient = await tx.patient.update({
            where: { id: patient.id },
            data: patientUpdateData,
          });
        } else {
          let shouldCreatePatientOnUpdate = false;
          if (data.birthDate) {
            shouldCreatePatientOnUpdate = true;
          } else {
            if (data.address) {
              shouldCreatePatientOnUpdate = true;
            } else {
              if (data.role === Role.PACIENTE) {
                shouldCreatePatientOnUpdate = true;
              } else {
                shouldCreatePatientOnUpdate = false;
              }
            }
          }

          if (shouldCreatePatientOnUpdate) {
            let cpfValue = '';
            if (data.registerDoc) {
              cpfValue = data.registerDoc.replace(/\D/g, '');
            } else {
              cpfValue = '';
            }

            let validCpf = '';
            if (cpfValue.length === 11) {
              validCpf = cpfValue;
            } else {
              validCpf = `CPF${user.id}${Date.now().toString().slice(-6)}`;
            }

            let updateBirthDate = null;
            if (data.birthDate) {
              updateBirthDate = new Date(data.birthDate);
            } else {
              updateBirthDate = null;
            }

            patient = await tx.patient.create({
              data: {
                name: user.name,
                cpf: validCpf,
                phone: user.phone,
                birthDate: updateBirthDate,
                address: data.address,
                userId: user.id,
              },
            });
          }
        }
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        registerDoc: user.registerDoc,
        phone: user.phone,
        active: user.active,
        permissions: user.permissions,
        createdAt: user.createdAt,
        patient: patient
          ? {
              id: patient.id,
              cpf: patient.cpf,
              birthDate: patient.birthDate,
              address: patient.address,
              phone: patient.phone,
            }
          : null,
      };
    });
  }

  async delete(id: number) {
    return prisma.user.delete({ where: { id } });
  }
}