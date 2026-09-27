// imports de bibliotecas
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import Cookies from 'js-cookie';

// url base da api. vem da env publica do next (next_public_api_url).
// quando nao configurada, fica string vazia e as chamadas viram
// relativas (util em dev com proxy ou no mesmo host).
let API_BASE_URL = '';
if (process.env.NEXT_PUBLIC_API_URL) {
  API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
} else {
  API_BASE_URL = '';
}

// instancia do axios usada em todo o app. define content-type
// json e um timeout de 15s. os interceptors abaixo cuidam de
// injetar o token e de normalizar erros.
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// interceptor de requisicao. antes de cada chamada, resolve o
// token (prioriza cookie, cai pro localstorage como fallback) e
// injeta o header authorization no formato bearer.
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // tenta o token do cookie primeiro.
    let token = Cookies.get('auth_token');
    if (!token) {
      // se nao tiver no cookie e estiver no browser, tenta o
      // localstorage. cobre o caso do cookie ter expirado mas a
      // sessao ainda estar viva no client.
      if (typeof window !== 'undefined') {
        const localToken = localStorage.getItem('token');
        if (localToken) {
          token = localToken;
        } else {
          token = undefined;
        }
      }
    }

    if (token) {
      if (config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// interceptor de resposta. faz duas coisas:
// 1) trata 401 global: limpa cookies/localstorage pra forcar
//    re-login. com uma excecao: nas rotas /login e /register,
//    nao mexe em nada (senao limparia a sessao no proprio fluxo
//    de autenticacao).
// 2) normaliza a mensagem de erro pra ser consumida em qualquer
//    lugar (err.message) sem depender do formato do axios.
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError<{ error?: string; message?: string }>) => {
    // tratamento de 401. so limpa a sessao se nao estiver nas
    // telas publicas de auth (login/register).
    if (error) {
      if (error.response) {
        // nota: toasts de permissao nao sao exibidos globalmente
        // aqui. o tratamento de 401/403 fica nos componentes
        // individuais pra evitar spam durante carregamentos em
        // background. toasts so devem aparecer apos acao direta
        // do usuario.

        if (error.response.status === 401) {
          if (typeof window !== 'undefined') {
            const isLogin = window.location.pathname.startsWith('/login');
            const isRegister = window.location.pathname.startsWith('/register');
            if (!isLogin) {
              if (!isRegister) {
                // limpa tudo da sessao pra forcar relogin.
                Cookies.remove('auth_token', { path: '/' });
                Cookies.remove('user_role', { path: '/' });
                Cookies.remove('user_info', { path: '/' });
                localStorage.removeItem('token');
                localStorage.removeItem('user');
              }
            }
          }
        }
      }
    }

    // extrai a melhor mensagem de erro possivel, na ordem:
    // 1) response.data.error (mensagem de negocio da api)
    // 2) response.data.message
    // 3) error.message (rede/axios)
    // 4) fallback generico
    // o objetivo e que quem consumir so precise ler err.message,
    // independente da origem do erro.
    let errorMessage = 'Erro ao processar requisição';
    if (error) {
      if (error.response) {
        if (error.response.data) {
          if (error.response.data.error) {
            errorMessage = error.response.data.error;
          } else if (error.response.data.message) {
            errorMessage = error.response.data.message;
          } else if (error.message) {
            errorMessage = error.message;
          } else {
            errorMessage = 'Erro ao processar requisição';
          }
        } else if (error.message) {
          errorMessage = error.message;
        } else {
          errorMessage = 'Erro ao processar requisição';
        }
      } else if (error.message) {
        errorMessage = error.message;
      } else {
        errorMessage = 'Erro ao processar requisição';
      }
    } else {
      errorMessage = 'Erro ao processar requisição';
    }

    return Promise.reject(new Error(errorMessage));
  }
);

export default apiClient;