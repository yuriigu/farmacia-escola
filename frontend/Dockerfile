FROM node:22-alpine

WORKDIR /app

# Copia arquivos de configuração de pacotes
COPY package.json package-lock.json* ./

# Instala todas as dependências
RUN npm install

# Copia o código fonte da aplicação
COPY . .

# Expõe a porta padrão do Next.js
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NODE_ENV=development

# Executa em modo desenvolvimento com Next.js Dev Server 
CMD ["npm", "run", "dev"]