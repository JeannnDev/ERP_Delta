import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * Auxiliar para ler variáveis do .env (compatível com SSR/Browser)
 * No Angular com SSR (Node), o process existe no servidor, mas não no navegador.
 */
const getEnv = (key: string, defaultValue: string): string => {
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key]!;
  }
  return defaultValue;
};

// Configurações globais extraídas do .env ou valores padrões
export const PROTHEUS_CONFIG = {
  apiBaseUrl: getEnv('apiBaseUrl', 'http://localhost:8080/rest').replace(/\/$/, ''),
  authorization: getEnv('Authorization', 'YWRtaW46amVhbg=='),
  empresa: getEnv('EMPRESA', '01'),
  filial: getEnv('FILIAL', '99')
};

@Injectable({
  providedIn: 'root'
})
export class ProtheusApiService {
  private http = inject(HttpClient);

  /**
   * Gera os headers padrões exigidos pelo Protheus REST
   */
  getHeaders(customFilial?: string): HttpHeaders {
    const auth = PROTHEUS_CONFIG.authorization.trim();
    const finalAuth = auth.startsWith('Basic ') ? auth : `Basic ${auth}`;

    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': finalAuth,
      'EMPRESA': PROTHEUS_CONFIG.empresa.trim(),
      'FILIAL': (customFilial || PROTHEUS_CONFIG.filial).trim()
    });
  }

  /**
   * Cria um cliente para um recurso específico do Protheus (ex: /WsFornecedor)
   * Semelhante ao padrão "axios.create" mas usando HttpClient nativo
   */
  resource(resourcePath: string) {
    // Garante que o path comece com / e não termine com /
    const sanitizedPath = resourcePath.startsWith('/') ? resourcePath : `/${resourcePath}`;
    const baseUrl = `${PROTHEUS_CONFIG.apiBaseUrl}${sanitizedPath.replace(/\/$/, '')}`;

    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      get: <T = unknown>(endpoint = '', options: any = {}): Observable<T> =>
        this.http.get<T>(`${baseUrl}${endpoint}`, { headers: this.getHeaders(), ...options }) as Observable<T>,

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      post: <T = unknown>(endpoint: string, body: any, options: any = {}): Observable<T> =>
        this.http.post<T>(`${baseUrl}${endpoint}`, body, { headers: this.getHeaders(), ...options }) as Observable<T>,

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      put: <T = unknown>(endpoint: string, body: any, options: any = {}): Observable<T> =>
        this.http.put<T>(`${baseUrl}${endpoint}`, body, { headers: this.getHeaders(), ...options }) as Observable<T>,

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete: <T = unknown>(endpoint: string, options: any = {}): Observable<T> =>
        this.http.delete<T>(`${baseUrl}${endpoint}`, { headers: this.getHeaders(), ...options }) as Observable<T>,

      baseUrl: baseUrl
    };
  }
}
