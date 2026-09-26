import { prisma } from '../utils/prisma';
import { Role } from '../types/enums';

// repositorio de usuario. e a camada que fala direto com o prisma
// pra ler e gravar usuarios (e, quando faz sentido, o paciente vinculado).
// o service usa essa classe pra nao conhecer detalhes do banco.
export class UserRepository {
  // busca usuario pelo email, que e unico. e o que o login usa.
  // traz o paciente junto porque o auth precisa saber se o usuario
  // tem cadastro de paciente associado.
  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
      include: { patient: true },
    });
  }

  // busca usuario por id, tambem com o paciente vinculado quando houver.
  async findById(id: number) {
    return prisma.user.findUnique({
      where: { id },
      include: { patient: true },
    });
  }

  // lista usuarios do sistema. a projection evita trazer senha
  // e mantem a resposta mais enxuta. do paciente, so os campos
  // usados pela tela de gestao de usuarios.
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

  // cria um usuario e, se fizer sentido pelo perfil ou pelos dados
  // que vieram, cria tambem o paciente vinculado. tudo numa transacao
  // pra nao ficar usuario orfao se a segunda parte falhar.
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

      // decide se cria o paciente. a regra e: se veio birthDate,
      // address, ou se o papel e PACIENTE, entao cria.
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
        // pega so os digitos do registerDoc pra tentar usar como cpf.
        let cpfValue = '';
        if (data.registerDoc) {
          cpfValue = data.registerDoc.replace(/\D/g, '');
        } else {
          cpfValue = '';
        }

        // se for um cpf valido (11 digitos), usa. senao, gera um
        // pseudo-cpf unico pra nao quebrar o unique do banco.
        let validCpf = '';
        if (cpfValue.length === 11) {
          validCpf = cpfValue;
        } else {
          validCpf = `CPF${user.id}${Date.now().toString().slice(-6)}`;
        }

        // normaliza birthDate pra Date, aceitando string ou Date.
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

      // devolve um shape enxuto, sem a senha.
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

  // atualiza usuario e, quando faz sentido, sincroniza o paciente vinculado.
  // o padrao de checar `campo !== undefined` e proposital: distingue
  // "nao veio no payload" de "veio com valor null/undefined explicito",
  // permitindo update parcial sem zerar campos nao informados.
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
      // monta o update do usuario so com os campos que vieram.
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

      // decide se precisa mexer no paciente. qualquer campo que tambem
      // vive no cadastro do paciente (nome, phone, address, birthDate,
      // registerDoc) dispara a sincronizacao.
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
        // se o paciente ja existe, atualiza so os campos que vieram.
        if (patient) {
          const patientUpdateData: any = {};
          if (data.name !== undefined) patientUpdateData.name = data.name;
          if (data.phone !== undefined) patientUpdateData.phone = data.phone;
          if (data.address !== undefined) patientUpdateData.address = data.address;
          if (data.birthDate !== undefined) {
            // normaliza pra Date ou null, evitando Invalid Date.
            let updateBirthDate = null;
            if (data.birthDate) {
              updateBirthDate = new Date(data.birthDate);
            } else {
              updateBirthDate = null;
            }
            patientUpdateData.birthDate = updateBirthDate;
          }
          if (data.registerDoc !== undefined) {
            // so atualiza cpf se o registerDoc virar um cpf valido.
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
          // se nao existe paciente ainda, criamos agora caso os dados
          // justifiquem (tem birthDate, address ou o papel virou PACIENTE).
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
            // mesma logica do create: usa cpf do registerDoc se for valido,
            // senao gera um pseudo-cpf unico.
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

            // normaliza birthDate pra Date ou null.
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

      // devolve o mesmo shape do create, sem senha.
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

  // exclusao de usuario. aqui e hard delete mesmo (apaga a linha).
  // o service e quem decide se deve chamar isso ou so desativar,
  // dependendo do contexto de negocio.
  async delete(id: number) {
    return prisma.user.delete({ where: { id } });
  }
}