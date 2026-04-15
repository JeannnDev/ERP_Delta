import { inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ProtheusApiService } from './protheus-api.service';
import {
  OPApiData,
  RecursoApontamento,
  Impressora,
  Etiqueta,
  ApontamentoPayload,
  ImpressaoPayload,
  ApontamentoApiResponse
} from '../models/apontamento.model';

@Injectable({
  providedIn: 'root'
})
export class ApontamentoApiService {
  private protheusApi = inject(ProtheusApiService);

  /**
   * Busca dados da Ordem de Produção
   */
  fetchOPData(opNumber: string, operatorCode: string): Observable<ApontamentoApiResponse<OPApiData>> {
    return this.protheusApi.resource(`WsFuncApontamento?OP=${opNumber}&OPERADOR=${operatorCode}`)
      .get<unknown>()
      .pipe(
        map((res: unknown) => {
          console.log('[API] Resposta bruta recebida da OP:', res);
          const raw = res as Record<string, unknown>;
          const response = (raw['RESPONSE'] || raw['response'] || raw) as Record<string, unknown>;

          if (response['status'] === false) {
            const errorMessage = typeof response['response'] === 'string'
              ? response['response'] as string
              : ((response['response'] as Record<string, unknown>)?.['errorMessage'] as string) || (response['errorMessage'] as string) || 'Erro desconhecido';
            return { success: false, error: errorMessage };
          }

          if (response['success'] === false) {
            const errorMessage = typeof response['response'] === 'string'
              ? response['response'] as string
              : (response['errorMessage'] as string) || 'Erro desconhecido';
            return { success: false, error: errorMessage };
          }

          if (!response || !response['op']) {
            return { success: false, error: 'OP não encontrada ou inválida' };
          }

          // Extrair operações do objeto roteiro
          let todasOperacoes: Record<string, unknown>[] = [];
          const roteiroUtilizado = (response['roteiroUtilizado'] as string) || '';

          if (response['roteiro'] && typeof response['roteiro'] === 'object') {
            const roteiro = response['roteiro'] as Record<string, unknown[]>;
            if (roteiroUtilizado && roteiro[roteiroUtilizado]) {
              todasOperacoes = Array.isArray(roteiro[roteiroUtilizado])
                ? roteiro[roteiroUtilizado] as Record<string, unknown>[]
                : [];
            } else {
              todasOperacoes = (Object.values(roteiro).flat() as Record<string, unknown>[]);
            }
          }

          // Fallback para formato antigo
          if (todasOperacoes.length === 0) {
            if (Array.isArray(response['operacoes'])) {
              todasOperacoes = response['operacoes'] as Record<string, unknown>[];
            } else if (response['operacoes'] && typeof response['operacoes'] === 'object') {
              todasOperacoes = Object.values(response['operacoes'] as object).flat() as Record<string, unknown>[];
            }
          }

          const opData: OPApiData = {
            op: response['op'] as string,
            produto: ((response['produto'] as string) || '').trim(),
            descProduto: (response['descProduto'] as string) || '',
            roteiroOp: (response['roteiroOp'] as string) || '',
            roteiroUtilizado: (response['roteiroUtilizado'] as string) || '',
            nest: (response['nest'] as number) || 0,
            quantidade: (response['quantidadeSolicitada'] as number) || 0,
            quantidadeSolicitada: (response['quantidadeSolicitada'] as number) || 0,
            previsaoIni: (response['previsaoIni'] as string) || '',
            dtEntrega: ((response['dtEntrega'] as string) || '').trim(),
            previsaoEntrega: (response['previsaoEntrega'] as string) || '',
            status: (response['status'] as string) || '',
            observacao: (response['observacao'] as string) || '',
            dtEmissao: (response['dtEmissao'] as string) || '',
            qtdProduzida: (response['qtdProduzida'] as number) || 0,
            situacao: (response['situacao'] as string) || '',
            tipoOp: (response['tipoOp'] as string) || '',
            tpProducao: (response['tpProducao'] as string) || '',
            opTerceiro: (response['opTerceiro'] as string) || '',
            operacoes: todasOperacoes
              .filter((op) => op && op['operac'])
              .map((op) => ({
                operac: op['operac'] as string,
                recurso: op['recurso'] as string,
                descricao: op['descricao'] as string,
                recno: op['recno'] as number,
                quantidadeSolicitada: (op['quantidadeSolicitada'] as number) ?? (response['quantidadeSolicitada'] as number) ?? 0,
                quantidadeProduzida: (op['quantidadeProduzida'] as number) || 0,
                quantidadePerdida: (op['quantidadePerdida'] as number) || 0,
                quantidadeFaltante: (op['quantidadeFaltante'] as number) || 0,
                parcialTotal: (op['parcialTotal'] as string) || '',
                status: (op['status'] as string) || '',
                encerrada: op['status'] === 'Finalizado' || op['parcialTotal'] === 'T',
                historico: (op['historico'] as never[]) || [],
                registros: (op['registros'] as never[]) || []
              })),
            saldo_item: Array.isArray(response['saldo_item'])
              ? (response['saldo_item'] as Record<string, unknown>[]).map((item) => ({
                  produto: item['produto'] as string,
                  um: item['um'] as string,
                  qtdeEmp: item['qtdeEmp'] as number,
                  saldoEstq: item['saldoEstq'] as number,
                  armz: item['armz'] as string,
                  endereco: item['endereco'] as string,
                  status: item['status'] as boolean,
                  descricao: item['descricao'] as string
                }))
              : []
          };

          return { success: true, data: opData };
        }),
        catchError(error => {
          console.error('Erro ao buscar dados da OP:', error);
          return of({ success: false, error: 'Erro ao buscar dados da OP' });
        })
      );
  }

  /**
   * Busca lista de operadores
   */
  fetchOperadoresList(): Observable<Record<string, unknown>[]> {
    return this.protheusApi.resource('WsOperadorAll')
      .get<unknown>()
      .pipe(
        map((response: unknown) => {
          const raw = response as Record<string, unknown>;
          const operadores = raw['RESPONSE'] || raw['response'] || raw['operadores'] || (Array.isArray(response) ? response : []);
          return Array.isArray(operadores) ? operadores as Record<string, unknown>[] : [];
        }),
        catchError(error => {
          console.error('Erro ao buscar lista de operadores:', error);
          return of([]);
        })
      );
  }

  /**
   * Valida operador pelo cache de operadores
   */
  validateOperador(codigo: string, senha: string, cachedOperadores: Record<string, unknown>[]): Observable<ApontamentoApiResponse<{ nome: string }>> {
    const source$ = cachedOperadores && cachedOperadores.length > 0
      ? of(cachedOperadores)
      : this.fetchOperadoresList();

    return source$.pipe(
      map(operadores => {
        if (operadores.length === 0) {
          return { success: false, error: 'Operador não encontrado' };
        }

        const operadorEncontrado = operadores.find((opt) => {
          const codApi = ((opt['Codigo'] || opt['CODIGO'] || opt['codigo'] || '') as string).toString().trim();
          return codApi.toLowerCase() === codigo.trim().toLowerCase();
        });

        if (!operadorEncontrado) {
          return { success: false, error: 'Operador não encontrado' };
        }

        const senhaApi = (
          operadorEncontrado['Senha'] ||
          operadorEncontrado['SENHA'] ||
          operadorEncontrado['senha'] ||
          operadorEncontrado['SENHAOP'] ||
          operadorEncontrado['senhaop'] ||
          operadorEncontrado['password'] ||
          ''
        ).toString().trim();

        const senhaDigitada = senha.trim();
        const senhaValida = senhaApi === senhaDigitada || senhaApi.toLowerCase() === senhaDigitada.toLowerCase();

        if (!senhaValida) {
          return { success: false, error: 'Senha incorreta' };
        }

        const nome = (
          operadorEncontrado['Nome'] ||
          operadorEncontrado['NOME'] ||
          operadorEncontrado['nome'] ||
          ''
        ).toString().trim();

        return { success: true, data: { nome } };
      })
    );
  }

  /**
   * Busca lista de recursos de produção
   */
  fetchRecursos(): Observable<RecursoApontamento[]> {
    return this.protheusApi.resource('WsRecurso')
      .get<unknown>()
      .pipe(
        map((response: unknown) => {
          const raw = response as Record<string, unknown>;
          const data = raw['response'] || raw['RESPONSE'] || [];
          if (Array.isArray(data)) {
            return (data as Record<string, unknown>[]).map((recurso) => ({
              codigo: ((recurso['codigo'] as string) || '').trim(),
              descricao: ((recurso['descricao'] as string) || '').trim()
            }));
          }
          return [];
        }),
        catchError(error => {
          console.error('Erro ao buscar recursos:', error);
          return of([]);
        })
      );
  }

  /**
   * Busca lista de impressoras
   */
  fetchImpressoras(): Observable<Impressora[]> {
    return this.protheusApi.resource('WsZPL')
      .get<unknown>()
      .pipe(
        map((response: unknown) => {
          const raw = response as Record<string, unknown>;
          const data = raw['response'] || raw['RESPONSE'] || [];
          if (Array.isArray(data)) {
            return (data as Record<string, unknown>[]).map((p) => ({
              id: p['codigo'] as string,
              name: p['descricao'] as string,
              zplId: p['Id_ZPL'] as string
            }));
          }
          return this.getImpressorasPadrao();
        }),
        catchError(() => of(this.getImpressorasPadrao()))
      );
  }

  /**
   * Busca lista de etiquetas
   */
  fetchEtiquetas(seq = 'ETQ'): Observable<Etiqueta[]> {
    return this.protheusApi.resource(`WsLabel?SEQ=${seq}`)
      .get<unknown>()
      .pipe(
        map((response: unknown) => {
          const raw = response as Record<string, unknown>;
          const data = raw['response'] || raw['RESPONSE'] || [];
          if (Array.isArray(data)) {
            return (data as Record<string, unknown>[]).map((label) => ({
              id: label['codigo'] as string,
              name: label['nome'] as string,
              origem: label['origem'] as string,
              zpl: label['zpl'] as string,
              sequencia: label['sequencia'] as string
            }));
          }
          return this.getEtiquetasPadrao();
        }),
        catchError(() => of(this.getEtiquetasPadrao()))
      );
  }

  /**
   * Realiza o apontamento de produção com formatação rigorosa de decimais para Protheus
   */
  apontarProducao(payload: ApontamentoPayload): Observable<ApontamentoApiResponse> {
    const jsonString = this.stringifyWithFixedDecimals(payload);

    console.log('======= APONTAMENTO DE PRODUÇÃO (ERP Delta) =======');
    console.log('Endpoint: WSAPONTAPRODUCAO');
    console.log('Payload:', jsonString);
    console.log('====================================================');

    return this.protheusApi.resource('WSAPONTAPRODUCAO')
      .post<unknown>('', jsonString)
      .pipe(
        map((response: unknown) => {
          const raw = response as Record<string, unknown>;
          if (raw['status'] === false || raw['success'] === false) {
            const errorMessage = (raw['response'] as Record<string, unknown>)?.['errorMessage'] as string ||
              raw['response'] as string ||
              raw['error'] as string ||
              'Erro ao apontar produção';
            return { success: false, error: errorMessage, data: response };
          }
          return { success: true, data: response };
        }),
        catchError(error => {
          console.error('Erro ao apontar produção:', error);
          return of({ success: false, error: error.message || 'Erro ao apontar produção' });
        })
      );
  }

  /**
   * Imprime etiqueta de produção
   */
  imprimirEtiqueta(payload: ImpressaoPayload): Observable<ApontamentoApiResponse> {
    return this.protheusApi.resource('WsPrinter')
      .post<unknown>('', payload)
      .pipe(
        map((response: unknown) => {
          const raw = response as Record<string, unknown>;
          if (raw['status'] === false || raw['success'] === false) {
            const errorMessage = (raw['response'] as Record<string, unknown>)?.['errorMessage'] as string ||
              raw['response'] as string ||
              'Erro ao imprimir etiqueta';
            return { success: false, error: errorMessage };
          }
          return { success: true, data: response };
        }),
        catchError(error => {
          console.error('Erro ao imprimir etiqueta:', error);
          return of({ success: false, error: error.message || 'Erro ao imprimir etiqueta' });
        })
      );
  }

  /**
   * Força decimais fixos no JSON para o MsExecAuto do Protheus
   */
  private stringifyWithFixedDecimals(payload: ApontamentoPayload): string {
    const fields4 = ['QUANTIDADE', 'PERDA', 'PERDAANTERIOR', 'QTD2UM', 'PERIMP'];
    const fields2 = ['POTENCIA', 'RATEIO', 'QTDEGANHO'];

    let json = JSON.stringify(payload);

    fields4.forEach(field => {
      const regex = new RegExp(`("${field}":\\s*)([0-9.]+)`, 'g');
      json = json.replace(regex, (_, p1, p2) => `${p1}${parseFloat(p2).toFixed(4)}`);
    });

    fields2.forEach(field => {
      const regex = new RegExp(`("${field}":\\s*)([0-9.]+)`, 'g');
      json = json.replace(regex, (_, p1, p2) => `${p1}${parseFloat(p2).toFixed(2)}`);
    });

    return json;
  }

  private getImpressorasPadrao(): Impressora[] {
    return [
      { id: 'printer1', name: 'Impressora 1 - Produção', zplId: '' },
      { id: 'printer2', name: 'Impressora 2 - Escritório', zplId: '' },
      { id: 'printer3', name: 'Impressora 3 - Almoxarifado', zplId: '' }
    ];
  }

  private getEtiquetasPadrao(): Etiqueta[] {
    return [
      { id: '000001', name: 'Etiqueta Padrão', origem: 'Default', zpl: '', sequencia: 'ETQ' },
      { id: '000002', name: 'Etiqueta de Produção', origem: 'Producao', zpl: '', sequencia: 'ETQ' }
    ];
  }
}
