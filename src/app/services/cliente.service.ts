import { inject, Injectable, signal, computed } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { Cliente } from '../models/cliente.model';
import { AdvplField, AdvplRequest } from '../models/fornecedor.model';
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
export class ClienteService {
  private api = inject(ProtheusApiService).resource('WsCliente');
  
  private clientesSignal = signal<Cliente[]>([]);
  private loadingSignal = signal<boolean>(false);
  private messageSignal = signal<string>('');

  readonly clientes = computed(() => this.clientesSignal());
  readonly loading = computed(() => this.loadingSignal());
  readonly message = computed(() => this.messageSignal());

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
        response = JSON.parse(rawResponse as string);
      } catch {
        this.messageSignal.set((rawResponse as string).trim());
        this.clientesSignal.set([]);
        return;
      }
      
      let list: Cliente[] = [];
      if (response?.response) this.messageSignal.set(response.response);

      if (response?.success && response?.data) {
        const item = this.mapFromAdvpl(response.data);
        list = item ? [item] : [];
      } else if (response?.Data) {
        const dataArr = Array.isArray(response.Data) ? response.Data : [response.Data];
        list = dataArr.map((i) => this.mapFromAdvpl(i)!).filter(Boolean) as Cliente[];
      }
      
      this.clientesSignal.set(list);
    } catch (error: unknown) {
      this.clientesSignal.set([]);
      this.extractError(error);
      throw error;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  async create(cliente: Cliente): Promise<void> {
    this.loadingSignal.set(true);
    const doc = (cliente.A1_CGC || '').replace(/\D/g, '');
    const url = `/INCLUIR/${doc ? `?cCgc=${doc}` : ''}`;
    const body = this.mapToAdvpl(cliente);
    
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

  async update(cliente: Cliente): Promise<void> {
    this.loadingSignal.set(true);
    const doc = (cliente.A1_CGC || '').replace(/\D/g, '');
    const url = `/ALTERAR${doc ? `?cCgc=${doc}` : ''}`;
    const body = this.mapToAdvpl(cliente);
    
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

  async delete(cCgc: string): Promise<void> {
    this.loadingSignal.set(true);
    const doc = cCgc.replace(/\D/g, '');
    const url = `/DELETE${doc ? `?cCgc=${doc}` : ''}`;
    
    try {
      await lastValueFrom(
        this.api.delete<string>(url, { responseType: 'text' })
      );
      this.clientesSignal.update(list => list.filter(f => f.A1_CGC !== cCgc));
    } catch (error: unknown) {
      this.extractError(error);
      throw error;
    } finally {
      this.loadingSignal.set(false);
    }
  }

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

  private mapToAdvpl(cliente: Cliente): AdvplRequest {
    const data: AdvplField[] = Object.entries(cliente)
      .filter(([key]) => key !== 'A1_CGC')
      .map(([key, value]) => ({
        campo: key,
        tipo: typeof value === 'number' ? 'N' : 'C',
        valor: String(value)
      }));
    return { Data: data };
  }

  private mapFromAdvpl(data: unknown): Cliente | null {
    if (!data || !Array.isArray(data)) return null;
    const obj: Record<string, string | number> = {};
    data.forEach((item: unknown) => {
      if (Array.isArray(item) && item.length === 2) {
        const [campo, valor] = item as [string, string | number];
        obj[campo] = typeof valor === 'string' ? valor.trim() : valor;
      } else if (item && typeof item === 'object' && 'campo' in item && 'valor' in (item as Record<string, unknown>)) {
        const field = item as { campo: string, valor: string | number };
        obj[field.campo] = typeof field.valor === 'string' ? field.valor.trim() : field.valor;
      }
    });
    return Object.keys(obj).length > 0 ? (obj as Cliente) : null;
  }
}
