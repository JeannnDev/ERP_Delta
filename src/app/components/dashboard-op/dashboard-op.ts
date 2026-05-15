import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PoModule } from '@po-ui/ng-components';

export interface DashboardOP {
  op: string;
  produto: string;
  descProduto: string;
  operacao: string;
  recurso: string;
  operador: string;
  status: 'Em Andamento' | 'Encerrada' | 'Aguardando' | 'Pausada';
  pausado: boolean;
  motivoPausa?: string;
  tempoEfetivo: string;
  tempoPausaTotal: string;
  totalSeconds: number; // Para facilitar o tick do cronômetro
  previsaoEntrega: string;
  dataPrevista: string; // Sempre guarda a previsão original para cálculo de atraso
  qtdSolicitada: number;
  qtdProduzida: number;
}

import { ApontamentoApiService } from '../../services/apontamento-api.service';
import { ApontamentoService } from '../../services/apontamento.service';
import { firstValueFrom } from 'rxjs';
import { CtrlTempoData } from '../../models/apontamento.model';

@Component({
  selector: 'app-dashboard-op',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PoModule],
  templateUrl: './dashboard-op.html',
  styleUrl: './dashboard-op.css',
})
export class DashboardOpComponent implements OnInit, OnDestroy {
  private apiService = inject(ApontamentoApiService);
  private apontamentoService = inject(ApontamentoService);
  private tickInterval?: ReturnType<typeof setInterval>;

  // ── State ──
  searchTerm      = signal('');
  searchTermValue = '';               // ngModel binding for po-input
  activeFilter    = signal<string>('Todos');

  // ── Counters ──
  totalEmAndamento = signal(0);
  totalEncerradas  = signal(0);
  totalPausadas    = signal(0);
  totalAguardando  = signal(0);
  totalAtrasadas   = signal(0);

  isLoading = signal(false);
  ops: DashboardOP[] = [];

  // ── Computed filter (status + busca + ordenação) ──
  get filteredOps(): DashboardOP[] {
    const term = this.searchTerm().toLowerCase().trim();
    const filt = this.activeFilter();

    const list = this.ops.filter(op => {
      const matchStatus = filt === 'Todos' || 
                         op.status === filt || 
                         (filt === 'Pausada' && op.pausado) ||
                         (filt === 'Atrasada' && this.isAtrasada(op));
      const matchSearch = !term ||
        op.op.toLowerCase().includes(term) ||
        op.produto.toLowerCase().includes(term) ||
        op.descProduto.toLowerCase().includes(term) ||
        op.operador.toLowerCase().includes(term) ||
        op.recurso.toLowerCase().includes(term);
      return matchStatus && matchSearch;
    });

    // ── Ordenação Customizada ──
    return list.sort((a, b) => {
      const aLate = this.isAtrasada(a);
      const bLate = this.isAtrasada(b);

      // 1. Atrasados Primeiro
      if (aLate && !bLate) return -1;
      if (!aLate && bLate) return 1;

      // 2. Por Status (Em Andamento > Aguardando > Encerrada)
      const priority: Record<string, number> = {
        'Em Andamento': 1,
        'Aguardando':   2,
        'Encerrada':    3
      };

      const pA = priority[a.status] || 99;
      const pB = priority[b.status] || 99;

      if (pA !== pB) return pA - pB;

      // Desempate por OP
      return a.op.localeCompare(b.op);
    });
  }

  // ── Lifecycle ──
  ngOnInit(): void {
    this.loadDashboardData();
    this.tickInterval = setInterval(() => this.tickTimers(), 1000);
    // Refresh dos dados a cada 30 segundos
    setInterval(() => this.loadDashboardData(), 30000);
  }

  async loadDashboardData() {
    this.isLoading.set(true);
    try {
      const history = await firstValueFrom(this.apiService.fetchCtrlTempo({}));
      this.ops = this.processHistory(history as CtrlTempoData[]);
      this.recalcCounters();
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  private processHistory(history: CtrlTempoData[]): DashboardOP[] {
    const grouped = new Map<string, CtrlTempoData[]>();

    history.forEach(event => {
      const key = `${event.ZT_OP}_${event.ZT_OPER}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)?.push(event);
    });

    const dashboardData: DashboardOP[] = [];

    grouped.forEach((events) => {
      // Ordena por data/hora
      const sorted = [...events].sort((a, b) => (a.ZT_DATA + a.ZT_HORA).localeCompare(b.ZT_DATA + b.ZT_HORA));
      const firstInicio = sorted.find(e => e.ZT_EVENTO === 'INICIO');
      const lastEvent = sorted[sorted.length - 1];

      if (!firstInicio) return;

      const startTime = this.parseDateTime(firstInicio.ZT_DATA, firstInicio.ZT_HORA).getTime();
      const lastTime = this.parseDateTime(lastEvent.ZT_DATA, lastEvent.ZT_HORA).getTime();
      
      const totalLeadTimeSeconds = lastEvent.ZT_EVENTO === 'FIM'
        ? Math.floor((lastTime - startTime) / 1000)
        : Math.floor((Date.now() - startTime) / 1000);

      // Cálculo do Tempo de Pausa Total
      let pauseSeconds = 0;
      for (let i = 0; i < sorted.length - 1; i++) {
        const current = sorted[i];
        const next = sorted[i + 1];
        
        if (current.ZT_EVENTO === 'PAUSA' && next.ZT_EVENTO === 'INICIO') {
          const pauseStart = this.parseDateTime(current.ZT_DATA, current.ZT_HORA).getTime();
          const pauseEnd = this.parseDateTime(next.ZT_DATA, next.ZT_HORA).getTime();
          pauseSeconds += Math.floor((pauseEnd - pauseStart) / 1000);
        }
      }
      
      // Se o último evento for PAUSA, soma o tempo até agora no tempo de pausa
      if (lastEvent.ZT_EVENTO === 'PAUSA') {
        const pauseStart = this.parseDateTime(lastEvent.ZT_DATA, lastEvent.ZT_HORA).getTime();
        pauseSeconds += Math.floor((Date.now() - pauseStart) / 1000);
      }

      const netSeconds = totalLeadTimeSeconds - pauseSeconds;

      dashboardData.push({
        op: lastEvent.ZT_OP,
        produto: lastEvent.ZT_COD,
        descProduto: lastEvent.B1_DESCPRD || 'Não Encontrado', 
        operacao: lastEvent.ZT_OPER,
        recurso: lastEvent.ZT_RECURSO,
        operador: lastEvent.ZT_NOME,
        status: this.mapEventToStatus(lastEvent.ZT_EVENTO),
        pausado: lastEvent.ZT_EVENTO === 'PAUSA',
        motivoPausa: lastEvent.ZT_MOTIVO,
        tempoEfetivo: this.formatSeconds(netSeconds),
        tempoPausaTotal: this.formatSeconds(pauseSeconds),
        totalSeconds: netSeconds, // Agora o cronômetro vivo vai incrementar o tempo efetivo
        // Exibição na tela: mostra o fim se encerrada, senão a previsão.
        previsaoEntrega: lastEvent.ZT_EVENTO === 'FIM' 
          ? this.formatDate(lastEvent.ZT_DATA) 
          : this.formatDate(lastEvent.ZT_PRVFIM),
        // Referência fixa para cálculo de atraso (sempre a previsão original)
        dataPrevista: this.formatDate(lastEvent.ZT_PRVFIM),
        qtdSolicitada: 0,
        qtdProduzida: 0
      });
    });

    return dashboardData;
  }

  private mapEventToStatus(evento: string): 'Em Andamento' | 'Encerrada' | 'Aguardando' | 'Pausada' {
    switch (evento) {
      case 'INICIO': return 'Em Andamento';
      case 'PAUSA':  return 'Pausada';
      case 'FIM':    return 'Encerrada';
      default:       return 'Aguardando';
    }
  }

  private parseDateTime(d: string, t: string): Date {
    const year = parseInt(d.substring(0, 4));
    const month = parseInt(d.substring(4, 6)) - 1;
    const day = parseInt(d.substring(6, 8));
    const [h, m] = t.split(':').map(Number);
    return new Date(year, month, day, h, m || 0);
  }

  private formatSeconds(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }

  private formatDate(date: string): string {
    if (!date || date.length < 8) return '-';
    return `${date.substring(6,8)}/${date.substring(4,6)}/${date.substring(0,4)}`;
  }

  ngOnDestroy(): void {
    if (this.tickInterval) clearInterval(this.tickInterval);
  }

  // ── Actions ──
  setFilter(f: string): void { this.activeFilter.set(f); }
  onSearch(term: string): void { this.searchTerm.set(term ?? ''); }
  clearSearch(): void { this.searchTerm.set(''); this.searchTermValue = ''; }

  // ── Helpers ──
  getStatusTagColor(status: string): string {
    const map: Record<string, string> = {
      'Em Andamento': 'color-10',
      'Encerrada':    'color-08',
      'Pausada':      'color-03',
      'Aguardando':   'color-07',
    };
    return map[status] ?? 'color-07';
  }

  getProgressPercent(op: DashboardOP): number {
    if (!op.qtdSolicitada) return 0;
    return Math.min(100, Math.round((op.qtdProduzida / op.qtdSolicitada) * 100));
  }

  getProgressColor(pct: number): string {
    if (pct >= 100) return 'var(--color-10)';
    if (pct >= 50)  return 'var(--color-01)';
    if (pct >= 20)  return 'var(--color-03)';
    return 'var(--color-07)';
  }

  getSegments(op: DashboardOP): { filled: boolean }[] {
    const total = op.qtdSolicitada || 0;
    const produced = op.qtdProduzida || 0;
    
    return Array.from({ length: total }, (_, i) => ({
      filled: (i + 1) <= produced
    }));
  }

  isAtrasada(op: DashboardOP): boolean {
    if (!op.dataPrevista || op.dataPrevista === '-') return false;
    
    const [pd, pm, py] = op.dataPrevista.split('/').map(Number);
    const plannedDate = new Date(py, pm - 1, pd);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (op.status === 'Encerrada') {
       // Para encerradas, compara se o dia que terminou foi depois do planejado
       const [fd, fm, fy] = op.previsaoEntrega.split('/').map(Number);
       const finishDate = new Date(fy, fm - 1, fd);
       return finishDate > plannedDate;
    }
    
    // Para as demais, compara se hoje já passou do prazo
    return plannedDate < today;
  }

  private recalcCounters(): void {
    this.totalEmAndamento.set(this.ops.filter(o => o.status === 'Em Andamento').length);
    this.totalEncerradas.set(this.ops.filter(o => o.status === 'Encerrada').length);
    this.totalPausadas.set(this.ops.filter(o => o.pausado).length);
    this.totalAguardando.set(this.ops.filter(o => o.status === 'Aguardando').length);
    this.totalAtrasadas.set(this.ops.filter(o => this.isAtrasada(o)).length);
  }

  private tickTimers(): void {
    this.ops = this.ops.map(op => {
      // Se estiver produzindo, incrementa o tempo efetivo
      if (op.status === 'Em Andamento') {
        const total = op.totalSeconds + 1;
        return {
          ...op,
          totalSeconds: total,
          tempoEfetivo: this.formatSeconds(total),
        };
      }
      // Se estiver pausado, incrementa o tempo total de pausa
      if (op.status === 'Pausada') {
        const [h, m, s] = op.tempoPausaTotal.split(':').map(Number);
        const totalP = h * 3600 + m * 60 + s + 1;
        return {
          ...op,
          tempoPausaTotal: this.formatSeconds(totalP),
        };
      }
      return op;
    });
  }
}
