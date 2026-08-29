FROM node:22-alpine

WORKDIR /app

# Instala dependências de sistema necessárias para o Prisma e Node em Alpine
RUN apk add --no-cache openssl libc6-compat

# Copia arquivos de configuração de pacotes e schema do Prisma
COPY package.json package-lock.json* ./
COPY prisma ./prisma/

# Instala todas as dependências (incluindo devDependencies para nodemon e ts-node)
RUN npm install

# Gera o cliente Prisma
RUN npx prisma generate

# Copia o código fonte da aplicação
COPY . .

# Expõe a porta da API do backend
EXPOSE 3001

ENV PORT=3001
ENV NODE_ENV=development

# Executa em modo desenvolvimento com nodemon e hot-reload
CMD ["npm", "run", "dev"]
