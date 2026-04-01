import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { PedidoCsv, PedidoAgrupado, OrderPayload, ResultadoImportacao, RawRecord } from '../models/importacao.model';
import * as XLSX from 'xlsx';
import { ProtheusApiService } from './protheus-api.service';

@Injectable({
  providedIn: 'root'
})
export class ImportacaoService {
  private api = inject(ProtheusApiService).resource('WsPedidoVenda');
  
  /**
   * Lê CSV ou XLSX e converte para array de objetos (chaves = nome da coluna).
   */
  async lerGenerico(arquivo: File): Promise<RawRecord[]> {
    console.log('--- Iniciando leitura de arquivo genérico ---', arquivo.name);
    return new Promise((resolve, reject) => {
      if (!(arquivo instanceof Blob)) {
        console.error('O objeto fornecido não é um Blob/File!', arquivo);
        return reject(new Error('Objeto de arquivo inválido.'));
      }

      const reader = new FileReader();

      reader.onload = (e: ProgressEvent<FileReader>) => {
        try {
          const result = e.target?.result;
          if (!result) {
            console.warn('Leitura do arquivo retornou resultado vazio.');
            return resolve([]);
          }
          
          const data = new Uint8Array(result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });

          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];

          // Converte para JSON (array de objetos usando a primeira linha como chave)
          const jsonArr: RawRecord[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
          
          console.log(`Leitura concluída (${arquivo.name}): ${jsonArr.length} linhas.`);
          resolve(jsonArr);
        } catch (error) {
          console.error('Erro no XLSX parsing genérico:', error);
          reject(error);
        }
      };

      reader.onerror = (error) => {
        console.error('Erro no FileReader:', error);
        reject(error);
      };

      reader.readAsArrayBuffer(arquivo);
    });
  }

  /**
   * Mantém compatibilidade mas usa o novo leitor se necessário, ou mantém a lógica legada.
   * Lógica original mapeia manualmente.
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
            
            // Mapeamento dinâmico: as colunas do CSV vira chaves C5_ e C6_
            if (row && row.length >= 1 && (row[0] || row[1])) {
              pedidos.push({
                C5_EXTERNO: String(row[0] || '').trim(),
                C5_CLIENTE: String(row[1] || '').trim(),
                C6_PRODUTO: String(row[2] || '').trim(),
                C6_QTDVEN: Number(row[3] || 0),
                C6_PRCVEN: typeof row[4] === 'string' ? Number(row[4].replace(',', '.')) : Number(row[4] || 0)
              });
            }
          }
          resolve(pedidos);
        } catch (error) {
          reject(error);
        }
      };
      reader.readAsArrayBuffer(arquivo);
    });
  }

  /**
   * Envia os pedidos para o Protheus.
   */
  importar(pedidos: PedidoCsv[] | PedidoAgrupado[] | OrderPayload[], origem: string): Observable<ResultadoImportacao> {
    const payload = { origem, pedidos };
    const url = ``; // Chamada POST direta para /WsPedidoVenda
    
    console.log('--- ENVIANDO PARA O PROTHEUS (WsPedidoVenda) ---');
    console.log('PAYLOAD:', JSON.stringify(payload, null, 2));

    return this.api.post<ResultadoImportacao>(url, payload);
  }
}

