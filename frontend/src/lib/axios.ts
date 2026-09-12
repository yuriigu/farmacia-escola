// IMPORTS DE BIBLIOTECAS
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import Cookies from 'js-cookie';
import { toast } from 'sonner';

// DEFINICAO DA URL BASE DA API
let API_BASE_URL = '';
if (process.env.NEXT_PUBLIC_API_URL) {
  API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
} else {
  API_BASE_URL = '';
}

// CRIACAO DA INSTANCIA DO CLIENTE AXIOS
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// INTERCEPTOR DE REQUISICAO PARA ADICIONAR TOKEN JWT
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    let token = Cookies.get('auth_token');
    if (!token) {
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

// INTERCEPTOR DE RESPOSTA PARA TRATAR ERROS E STATUS 401
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError<{ error?: string; message?: string }>) => {
    // VERIFICANDO SE OCORREU ERRO DE STATUS 401
    if (error) {
      if (error.response) {
        if (error.response.status === 403) {
          if (typeof window !== 'undefined') {
            toast.error('Você não tem permissão para realizar esta ação.');
          }
          return Promise.reject(new Error('Você não tem permissão para realizar esta ação.'));
        }

        if (error.response.status === 401) {
          if (typeof window !== 'undefined') {
            const isLogin = window.location.pathname.startsWith('/login');
            const isRegister = window.location.pathname.startsWith('/register');
            if (!isLogin) {
              if (!isRegister) {
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

    // EXTRAINDO A MENSAGEM DE ERRO COM FALLBACK VERBOSO
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
