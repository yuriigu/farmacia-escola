import { Request, Response, NextFunction } from 'express';

// MENSAGEM GENERICA DE ERRO INTERNO (NAO REVELA DETALHES DA IMPLEMENTACAO)
const INTERNAL_ERROR_MESSAGE = 'Erro interno no servidor';

export function errorMiddleware(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('Unhandled API Error:', err);

  // ERROS DE PAYLOAD DO EXPRESS (JSON MALFORMADO / PAYLOAD EXCESSIVO)
  if (err && err.type === 'entity.too.large') {
    res.status(413).json({ error: 'Corpo da requisição excede o tamanho máximo permitido' });
    return;
  }
  if (err && err.type === 'entity.parse.failed') {
    res.status(400).json({ error: 'Corpo da requisição não é um JSON válido' });
    return;
  }

  let statusCode = 500;

  if (err) {
    if (err.statusCode) {
      statusCode = Number(err.statusCode);
    } else {
      if (err.status) {
        statusCode = Number(err.status);
      }
    }
  }

  if (!Number.isFinite(statusCode) || statusCode < 400 || statusCode > 599) {
    statusCode = 500;
  }

  // ERROS 4xx POSSUEM MENSAGENS DE NEGOCIO DESTINADAS AO CLIENTE.
  // ERROS 5xx NUNCA DEVEM EXPOR DETALHES INTERNOS (PRISMA/SQL, CAMINHOS,
  // NOMES DE TABELAS, MENSAGENS DE BIBLIOTECAS) PARA EVITAR VAZAMENTO DE DADOS.
  const isServerError = statusCode >= 500;

  let message = INTERNAL_ERROR_MESSAGE;
  if (!isServerError) {
    if (err) {
      if (err.message) {
        message = err.message;
      }
    }
  }

  if (isServerError) {
    res.status(statusCode).json({ error: message });
    return;
  }

  // STACK TRAIL SOMENTE EM AMBIENTE DE DESENVOLVIMENTO E PARA ERROS 4xx
  if (process.env.NODE_ENV === 'development') {
    res.status(statusCode).json({
      error: message,
      stack: err ? err.stack : undefined,
    });
    return;
  }

  res.status(statusCode).json({ error: message });
  return;
}