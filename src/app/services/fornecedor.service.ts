import { inject, Injectable, signal, computed } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { AdvplField, AdvplRequest, Fornecedor } from '../models/fornecedor.model';
// O usuário solicitou não usar environment.ts e consultar do .env
// No Angular com SSR (Node), o process existe no servidor, mas não no navegador.
// Usamos uma checagem segura para evitar o erro "process is not defined".
import { ProtheusApiService } from './protheus-api.service';

interface ProtheusResponse {
  response?: string;
  success?: boolean;
  data?: unknown;
  Data?: unknown | unknown[];
}

@Injectable({
  providedIn: 'root'
})
export class FornecedorService {
  private api = inject(ProtheusApiService).resource('WsFornecedor');
  
  // -- ESTADO REATIVO (Signals) --
  private fornecedoresSignal = signal<Fornecedor[]>([]);
  private loadingSignal = signal<boolean>(false);
  private messageSignal = signal<string>('');

  readonly fornecedores = computed(() => this.fornecedoresSignal());
  readonly loading = computed(() => this.loadingSignal());
  readonly message = computed(() => this.messageSignal());

  /**
   * Traz os fornecedores (GET) - Usando responseType 'text' para evitar erro de JSON inválido
   */
  async getAll(cCgc = ''): Promise<void> {
    this.loadingSignal.set(true);
    this.messageSignal.set('');
    const url = `/GET${cCgc ? `?cCgc=${cCgc}` : ''}`;
    
    try {
      const rawResponse = await lastValueFrom(
        this.api.get<string>(url, { responseType: 'text' })
      );
      
      let response: ProtheusResponse;
      try {
        response = JSON.parse(rawResponse);
      } catch {
        // Se falhar o parse, assumimos que é uma mensagem direta (ex: Fornecedor não encontrado)
        this.messageSignal.set(rawResponse.trim());
        this.fornecedoresSignal.set([]);
        return;
      }
      
      let list: Fornecedor[] = [];
      if (response?.response) this.messageSignal.set(response.response);

      if (response?.success && response?.data) {
        const item = this.mapFromAdvpl(response.data);
        list = item ? [item] : [];
      } else if (response?.Data) {
        const dataArr = Array.isArray(response.Data) ? response.Data : [response.Data];
        list = dataArr.map((i) => this.mapFromAdvpl(i)!).filter(Boolean) as Fornecedor[];
      }
      
      this.fornecedoresSignal.set(list);
    } catch (error: unknown) {
      this.fornecedoresSignal.set([]);
      this.extractError(error);
      throw error;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Cria um novo fornecedor (POST)
   */
  /**
   * Cria um novo fornecedor (POST/INCLUIR) - Ex: /WsFornecedor/INCLUIR/12345678901
   */
  async create(fornecedor: Fornecedor): Promise<void> {
    this.loadingSignal.set(true);
    const doc = (fornecedor.A2_CGC || '').replace(/\D/g, ''); // Limpa pontuação (somente números)
    
    // O POST/INCLUIR agora também usa o CGC como query parameter
    const url = `/INCLUIR/${doc ? `?cCgc=${doc}` : ''}`;
    const body = this.mapToAdvpl(fornecedor);
    
    console.log('--- ENVIANDO PARA O PROTHEUS (INCLUIR) ---');
    console.log('URL:', this.api.baseUrl + url);
    console.log('PAYLOAD:', JSON.stringify(body, null, 2));
    
    try {
      await lastValueFrom(
        this.api.post<string>(url, body, { responseType: 'text' })
      );
    } catch (error: unknown) {
      this.extractError(error);
      throw error;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Altera (PUT/ALTERAR) - Ex: /WsFornecedor/ALTERAR?cCgc=...
   */
  async update(fornecedor: Fornecedor): Promise<void> {
    this.loadingSignal.set(true);
    const doc = (fornecedor.A2_CGC || '').replace(/\D/g, ''); // Limpa pontuação
    
    // O ALTERAR usa o CGC como parâmetro de querystring: ?cCgc={doc}
    const url = `/ALTERAR${doc ? `?cCgc=${doc}` : ''}`;
    const body = this.mapToAdvpl(fornecedor);
    
    console.log('--- ENVIANDO PARA O PROTHEUS (ALTERAR) ---');
    console.log('URL:', this.api.baseUrl + url);
    console.log('PAYLOAD:', JSON.stringify(body, null, 2));

    try {
      await lastValueFrom(
        this.api.put<string>(url, body, { responseType: 'text' })
      );
    } catch (error: unknown) {
      this.extractError(error);
      throw error;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Exclui (DELETE)
   */
  async delete(cCgc: string): Promise<void> {
    this.loadingSignal.set(true);
    const doc = cCgc.replace(/\D/g, '');
    const url = `/DELETE${doc ? `?cCgc=${doc}` : ''}`;
    
    try {
      await lastValueFrom(
        this.api.delete<string>(url, { responseType: 'text' })
      );
      this.fornecedoresSignal.update(list => list.filter(f => f.A2_CGC !== cCgc));
    } catch (error: unknown) {
      this.extractError(error);
      throw error;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Centraliza a extração de mensagens de erro e limpeza de JSONs concatenados
   */
  private extractError(error: unknown) {
    let raw = "";
    const err = error as { error?: string | { response?: string }; message?: string };
    if (typeof err.error === 'string') {
      raw = err.error;
    } else if (err.error?.response) {
      raw = err.error.response;
    } else if (err.message) {
      raw = err.message;
    }

    let msg = "";
    if (raw) {
      const match = raw.match(/^([^{]+)/);
      msg = match ? match[1].trim() : raw.trim();
    }

    const isGeneric = 
      msg.toLowerCase().includes('internal server error') || 
      msg.toLowerCase().includes('http failure response') ||
      msg.toLowerCase().includes('unexpected token');

    if (msg && !isGeneric) {
      this.messageSignal.set(msg);
    } else {
      this.messageSignal.set("");
    }
  }

  // -- AUXILIARES DE MAPEAMENTO --

  private mapToAdvpl(fornecedor: Fornecedor): AdvplRequest {
    // Lista de campos que vão no corpo (excluindo o CGC que vai na URL)
    const data: AdvplField[] = Object.entries(fornecedor)
      .filter(([key]) => key !== 'A2_CGC') // Remove o CGC dos dados de envio
      .map(([key, value]) => ({
        campo: key,
        tipo: typeof value === 'number' ? 'N' : 'C',
        valor: String(value)
      }));
    return { Data: data };
  }

  /**
   * Transforma [["A2_COD", "111"], ["A2_NOME", "..."]] em Objeto
   */
  private mapFromAdvpl(data: unknown): Fornecedor | null {
    if (!data || !Array.isArray(data)) return null;

    const obj: Record<string, string | number> = {};

    data.forEach((item: unknown) => {
      // Se for o formato [["CAMPO", "VALOR"], ...]
      if (Array.isArray(item) && item.length === 2) {
        const [campo, valor] = item as [string, string | number];
        obj[campo] = typeof valor === 'string' ? valor.trim() : valor;
      } 
      // Se for o formato { campo: "...", valor: "..." }
      else if (item && typeof item === 'object' && 'campo' in item && 'valor' in (item as Record<string, unknown>)) {
        const field = item as { campo: string, valor: string | number };
        obj[field.campo] = typeof field.valor === 'string' ? field.valor.trim() : field.valor;
      }
    });

    return Object.keys(obj).length > 0 ? (obj as Fornecedor) : null;
  }
}
