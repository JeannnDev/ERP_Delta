import { inject, Injectable, signal, computed } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { Produto } from '../models/produto.model';
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
export class ProdutoService {
  private api = inject(ProtheusApiService).resource('WsProduto');
  
  private produtosSignal = signal<Produto[]>([]);
  private loadingSignal = signal<boolean>(false);
  private messageSignal = signal<string>('');

  readonly produtos = computed(() => this.produtosSignal());
  readonly loading = computed(() => this.loadingSignal());
  readonly message = computed(() => this.messageSignal());

  async getAll(cCod = ''): Promise<void> {
    this.loadingSignal.set(true);
    this.messageSignal.set('');
    const url = `/GET${cCod ? `?cCod=${cCod}` : ''}`;
    
    try {
      const rawResponse = await lastValueFrom(
        this.api.get<string>(url, { responseType: 'text' })
      );
      
      let response: ProtheusResponse;
      try {
        response = JSON.parse(rawResponse as string);
      } catch {
        this.messageSignal.set((rawResponse as string).trim());
        this.produtosSignal.set([]);
        return;
      }
      
      let list: Produto[] = [];
      if (response?.response) this.messageSignal.set(response.response);

      if (response?.success && response?.data) {
        const item = this.mapFromAdvpl(response.data);
        list = item ? [item] : [];
      } else if (response?.Data) {
        const dataArr = Array.isArray(response.Data) ? response.Data : [response.Data];
        list = dataArr.map((i) => this.mapFromAdvpl(i)!).filter(Boolean) as Produto[];
      }
      
      this.produtosSignal.set(list);
    } catch (error: unknown) {
      this.produtosSignal.set([]);
      this.extractError(error);
      throw error;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  async create(produto: Produto): Promise<void> {
    this.loadingSignal.set(true);
    const url = `/INCLUIR/${produto.B1_COD ? `?cCod=${produto.B1_COD}` : ''}`;
    const body = this.mapToAdvpl(produto);
    
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

  async update(produto: Produto): Promise<void> {
    this.loadingSignal.set(true);
    const url = `/ALTERAR${produto.B1_COD ? `?cCod=${produto.B1_COD}` : ''}`;
    const body = this.mapToAdvpl(produto);
    
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

  async delete(cCod: string): Promise<void> {
    this.loadingSignal.set(true);
    const url = `/DELETE${cCod ? `?cCod=${cCod}` : ''}`;
    
    try {
      await lastValueFrom(
        this.api.delete<string>(url, { responseType: 'text' })
      );
      this.produtosSignal.update(list => list.filter(f => f.B1_COD !== cCod));
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

  private mapToAdvpl(produto: Produto): AdvplRequest {
    const data: AdvplField[] = Object.entries(produto)
      .filter(([key]) => key !== 'B1_COD')
      .map(([key, value]) => ({
        campo: key,
        tipo: typeof value === 'number' ? 'N' : 'C',
        valor: String(value)
      }));
    return { Data: data };
  }

  private mapFromAdvpl(data: unknown): Produto | null {
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
    return Object.keys(obj).length > 0 ? (obj as Produto) : null;
  }
}
