import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { PedidoCsv, ResultadoImportacao } from '../models/importacao.model';
import * as XLSX from 'xlsx';
import { ProtheusApiService } from './protheus-api.service';

@Injectable({
  providedIn: 'root'
})
export class ImportacaoService {
  private api = inject(ProtheusApiService).resource('WsPedidoVenda');
  
  /**
   * Lê CSV ou XLSX e converte para array de PedidoCsv.
   */
  async lerArquivo(arquivo: File): Promise<PedidoCsv[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e: ProgressEvent<FileReader>) => {
        try {
          const result = e.target?.result;
          if (!result) return;
          const data = new Uint8Array(result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });

          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];

          // Converte para JSON (array de arrays)
          const jsonArr: unknown[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
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
   */
  importar(pedidos: PedidoCsv[], origem: string): Observable<ResultadoImportacao> {
    const payload = { origem, pedidos };
    const url = `/IMPORTAR`;
    
    console.log('--- ENVIANDO PARA O PROTHEUS (IMPORTAR) ---');
    console.log('URL:', this.api.baseUrl + url);
    console.log('PAYLOAD:', JSON.stringify(payload, null, 2));

    return this.api.post<ResultadoImportacao>(url, payload);
  }
}
