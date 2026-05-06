import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  PoModule,
  PoTableColumn,
  PoNotificationService,
  PoLoadingModule,
  PoTableModule
} from '@po-ui/ng-components';
import { ApontamentoApiService } from '../../services/apontamento-api.service';
import { NumericKeyboardComponent } from '../apontamento/numeric-keyboard/numeric-keyboard.component';
import {
  OPApiData,
  Operacao,
  HistoricoApontamento,
  SaldoItem,
  ApontamentoApiResponse
} from '../../models/apontamento.model';
import { firstValueFrom, timeout } from 'rxjs';

// Tipo local: item de material com status convertido para string (exigência do po-table label)
interface SaldoItemDisplay extends Omit<SaldoItem, 'status'> {
  status: string;
}

// Tipo local: operação com dados do operador mesclados para exibição direta na tabela
interface OperacaoDisplay extends Operacao {
  historicoDisplay: HistoricoApontamento[];
  operadorNome: string;
  operadorCod: string;
  hrIni: string;
  hrFim: string;
  tempoApont: string;
}

@Component({
  selector: 'app-historico-op',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PoModule,
    PoLoadingModule,
    PoTableModule,
    NumericKeyboardComponent
  ],
  templateUrl: './historico-op.html',
  styleUrls: ['./historico-op.css']
})
export class HistoricoOPComponent {
  private apiService = inject(ApontamentoApiService);
  private notification = inject(PoNotificationService);
  private cdr = inject(ChangeDetectorRef);

  opSearch = '';
  isLoading = false;
  items: SaldoItemDisplay[] = [];
  roteiro: OperacaoDisplay[] = [];
  opData: OPApiData | null = null;

  // Teclado
  showKeyboard = false;
  keyboardValue = '';

  readonly materiaisColumns: PoTableColumn[] = [
    { property: 'produto', label: 'Produto', width: '140px' },
    { property: 'descricao', label: 'Descrição', width: '200px' },
    { property: 'um', label: 'UM', width: '60px' },
    { property: 'qtOriginal', label: 'Qtd. Orig.', type: 'number', width: '100px' },
    { property: 'qtdeEmp', label: 'Empenhado', type: 'number', width: '100px' },
    { property: 'saldoEstq', label: 'Saldo Estq.', type: 'number', width: '110px' },
    { property: 'armz', label: 'Armz.', width: '80px' },
    { property: 'endereco', label: 'Endereço', width: '130px' },
    {
      property: 'status', label: 'Status', type: 'label', width: '110px',
      labels: [
        { value: 'true', color: 'color-11', label: 'Disponível' },
        { value: 'false', color: 'color-07', label: 'Indisponível' }
      ]
    }
  ];

  readonly operacaoColumns: PoTableColumn[] = [
    { property: 'operac', label: 'Operação', width: '90px' },
    { property: 'descricao', label: 'Descrição', width: '160px' },
    { property: 'recurso', label: 'Recurso', width: '100px' },
    { property: 'quantidadeProduzida', label: 'Qtd. Prod.', type: 'number', width: '100px' },
    { property: 'operadorCod', label: 'Cód. Op.', width: '90px' },
    { property: 'operadorNome', label: 'Operador', width: '180px' },
    { property: 'hrIni', label: 'Hr. Ini', width: '75px' },
    { property: 'hrFim', label: 'Hr. Fim', width: '75px' },
    { property: 'tempoApont', label: 'Tempo', width: '80px' },
    {
      property: 'status', label: 'Status', type: 'label', width: '110px',
      labels: [
        { value: 'Finalizado', color: 'color-08', label: 'Finalizado' },
        { value: 'Enc. Total', color: 'color-08', label: 'Enc. Total' },
        { value: 'Em Aberto', color: 'color-01', label: 'Em Aberto' },
        { value: 'Pendente', color: 'color-07', label: 'Pendente' }
      ]
    }
  ];

  // Formata data do Protheus (AAAAMMDD -> DD/MM/AAAA)
  formatProtheusDate(dateStr: string): string {
    if (!dateStr || dateStr.length !== 8) return dateStr;
    return `${dateStr.substring(6, 8)}/${dateStr.substring(4, 6)}/${dateStr.substring(0, 4)}`;
  }

  // Converte tempo Protheus (HHH:MM) em texto legível: '10 min' ou '1h 30min'
  formatTempo(tempoStr: string | number): string {
    const str = String(tempoStr ?? '').trim();
    const match = str.match(/^(\d+):(\d{2})$/);
    if (!match) return str;
    const horas = parseInt(match[1], 10);
    const mins  = parseInt(match[2], 10);
    if (horas === 0 && mins === 0) return '—';
    if (horas === 0) return `${mins} min`;
    if (mins === 0)  return `${horas}h`;
    return `${horas}h ${mins}min`;
  }

  getProgress(): number {
    const solicitada = this.opData?.quantidadeSolicitada ?? 0;
    const produzida = this.opData?.qtdProduzida ?? 0;
    return solicitada > 0 ? (produzida / solicitada) * 100 : 0;
  }

  // Colunas do histórico de apontamentos (usadas no ng-template do HTML)
  readonly historicoColumns: PoTableColumn[] = [
    { property: 'operadorCod', label: 'Cód. Operador', width: '120px' },
    { property: 'operadorNome', label: 'Nome do Operador' },
    { property: 'dtIni', label: 'Início', width: '100px' },
    { property: 'hrIni', label: 'Hora Ini', width: '80px' },
    { property: 'dtFim', label: 'Fim', width: '100px' },
    { property: 'hrFim', label: 'Hora Fim', width: '80px' },
    { property: 'qtdProd', label: 'Qtd. Prod.', type: 'number', width: '100px' },
    { property: 'tempoApont', label: 'Tempo', width: '100px' }
  ];

  getStatusColor(status: string): string {
    const encerrados = ['enc. total', 'encerrado', 'finalizado', 'concluído'];
    return encerrados.includes(status?.toLowerCase()) ? 'color-08' : 'color-02';
  }

  openKeyboard(): void {
    this.keyboardValue = this.opSearch;
    this.showKeyboard = true;
  }

  onKeyboardConfirm(value: string): void {
    this.opSearch = value;
    this.showKeyboard = false;
    this.validateOP();
  }

  async validateOP(): Promise<void> {
    if (!this.opSearch || this.isLoading) return;

    this.isLoading = true;
    this.cdr.detectChanges();

    try {
      const result = await firstValueFrom(
        this.apiService.fetchOPData(this.opSearch, '000001').pipe(timeout(15000))
      ) as ApontamentoApiResponse<OPApiData>;

      if (result.success && result.data) {
        const data = result.data;
        this.opData = data;

        // 1. Materiais — converte status boolean para string
        this.items = (data.saldo_item || []).map((item: SaldoItem): SaldoItemDisplay => ({
          ...item,
          status: String(item.status)
        }));

        // 2. Roteiro — achata o historico[0] nas colunas da linha principal
        this.roteiro = (data.operacoes || []).map((op: Operacao): OperacaoDisplay => {
          const h0 = op.historico?.[0];
          return {
            ...op,
            historicoDisplay: op.historico || [],
            operadorCod:  h0?.operadorCod  ?? '',
            operadorNome: h0?.operadorNome ?? '',
            hrIni:        h0?.hrIni        ?? '',
            hrFim:        h0?.hrFim        ?? '',
            tempoApont: this.formatTempo(h0?.tempoApont ?? '')
          };
        });

        // Delay para garantir que o Angular renderize as tabelas no DOM antes de tirar o overlay
        setTimeout(() => {
          this.isLoading = false;
          this.notification.success('Histórico completo carregado!');
          this.cdr.detectChanges();
        }, 500);

      } else {
        this.isLoading = false;
        this.resetData();
        this.notification.error(result.error || 'OP não encontrada.');
      }
    } catch (error: unknown) {
      this.isLoading = false;
      this.resetData();
      const isTimeout = error instanceof Error && error.name === 'TimeoutError';
      this.notification.error(isTimeout ? 'Tempo esgotado.' : 'Erro de conexão.');
    }
  }



  private resetData(): void {
    this.items = [];
    this.roteiro = [];
    this.opData = null;
  }

  clearSearch(): void {
    this.opSearch = '';
    this.resetData();
    this.cdr.detectChanges();
  }
}
