import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PedidoCsv, ResultadoImportacao } from '../models/importacao.model';
import * as XLSX from 'xlsx';

// Auxiliar para ler variáveis do .env (adaptado do FornecedorService)
const getEnv = (key: string, defaultValue: string): string => {
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key]!;
  }
  return defaultValue;
};

const CONFIG = {
  apiBaseUrl: getEnv('apiBaseUrl', 'http://localhost:8080/rest').replace(/\/$/, ''),
  authorization: getEnv('Authorization', 'YWRtaW46amVhbg=='), 
  empresa: getEnv('EMPRESA', '01'),
  filial: getEnv('FILIAL', '99')
};

@Injectable({
  providedIn: 'root'
})
export class ImportacaoService {
  private http = inject(HttpClient);
  
  // Recurso no Protheus (Ainda a ser criado)
  private readonly resource = `${CONFIG.apiBaseUrl}/WsPedidoVenda`;

  constructor() { }

  private getHeaders() {
    const auth = CONFIG.authorization.trim();
    const finalAuth = auth.startsWith('Basic ') ? auth : `Basic ${auth}`;

    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': finalAuth,
      'EMPRESA': CONFIG.empresa.trim(),
      'FILIAL': CONFIG.filial.trim()
    });
  }

  /**
   * Lê CSV ou XLSX e converte para array de PedidoCsv.
   * Mudado para ArrayBuffer para maior compatibilidade.
   */
  async lerArquivo(arquivo: File): Promise<PedidoCsv[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e: any) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });

          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];

          // Converte para JSON (array de arrays)
          const jsonArr: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          const pedidos: PedidoCsv[] = [];
          
          // Verificação robusta de cabeçalho
          let startLine = 0;
          if (jsonArr.length > 0) {
            const firstCell = String(jsonArr[0][0] || '').toLowerCase();
            if (firstCell.includes('pedido') || firstCell.includes('externo') || firstCell.includes('id')) {
              startLine = 1;
            }
          }

          for (let i = startLine; i < jsonArr.length; i++) {
            const row = jsonArr[i];
            
            // Aceita se tiver pelo menos as 3 colunas principais e dados básicos
            if (row && row.length >= 1 && (row[0] || row[1])) {
              pedidos.push({
                pedidoExterno: String(row[0] || '').trim(),
                cliente: String(row[1] || '').trim(),
                produto: String(row[2] || '').trim(),
                quantidade: Number(row[3] || 0),
                preco: typeof row[4] === 'string' ? Number(row[4].replace(',', '.')) : Number(row[4] || 0)
              });
            }
          }
          console.log('Fim do processamento de arquivo. Total: ' + pedidos.length);
          resolve(pedidos);
        } catch (error) {
          console.error('Erro no XLSX parsing:', error);
          reject(error);
        }
      };

      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(arquivo);
    });
  }

  /**
   * Envia os pedidos para o Protheus.
   * Por enquanto, estruturado para o futuro WebService.
   */
  importar(pedidos: PedidoCsv[], origem: string): Observable<ResultadoImportacao> {
    const payload = { origem, pedidos };
    const url = `${this.resource}/IMPORTAR`;
    
    console.log('--- ENVIANDO PARA O PROTHEUS (IMPORTAR) ---');
    console.log('URL:', url);
    console.log('PAYLOAD:', JSON.stringify(payload, null, 2));

    return this.http.post<ResultadoImportacao>(url, payload, { headers: this.getHeaders() });
  }
}
