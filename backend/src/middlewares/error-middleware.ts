import { Request, Response, NextFunction } from 'express';

// mensagem padrao usada pra erros 500. de proposito e generica,
// sem detalhes da implementacao, pra nao vazar informacao sensivel
// (nome de tabela, query, caminho de arquivo, etc) pro cliente.
const INTERNAL_ERROR_MESSAGE = 'Erro interno no servidor';

// middleware global de tratamento de erros. fica registrado por ultimo
// na cadeia do express e recebe qualquer erro que os middlewares
// anteriores (ou os controllers) lancarem via next(err) ou throw.
// aqui a gente normaliza a resposta: decide o status final,
// escolhe a mensagem e evita vazamento de detalhes internos.
export function errorMiddleware(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // logamos o erro cru no console pra debug local.
  // em producao, o ideal e trocar isso por um logger estruturado.
  console.error('Unhandled API Error:', err);

  // erros do proprio express no parse do body: payload grande demais
  // ou json malformado. tratamos separado porque nao sao erros de negocio.
  if (err && err.type === 'entity.too.large') {
    res.status(413).json({ error: 'Corpo da requisição excede o tamanho máximo permitido' });
    return;
  }
  if (err && err.type === 'entity.parse.failed') {
    res.status(400).json({ error: 'Corpo da requisição não é um JSON válido' });
    return;
  }

  // status padrao e 500, mas tentamos extrair um status melhor do erro
  // (statusCode ou status) caso ele tenha sido lancado por um service.
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

  // se o status extraido nao for um numero valido de http,
  // caimos de volta pro 500 pra nao responder algo estranho.
  if (!Number.isFinite(statusCode) || statusCode < 400 || statusCode > 599) {
    statusCode = 500;
  }

  // erros 4xx trazem mensagem de negocio feita pra ser lida pelo cliente.
  // erros 5xx nunca expoem detalhes internos (prisma, sql, caminhos,
  // nomes de tabela, mensagens de bibliotecas), pra evitar vazamento.
  const isServerError = statusCode >= 500;

  // comeca com a mensagem generica. so troca pela mensagem do erro
  // quando for 4xx, porque ai ela e util pro cliente entender o que houve.
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

  // em ambiente de desenvolvimento, incluimos o stack no retorno
  // pra facilitar o debug. mas so pra 4xx, mantendo a regra de nao
  // vazar detalhe de 5xx nem em dev.
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