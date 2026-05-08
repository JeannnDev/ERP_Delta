import { Component, OnInit, OnDestroy, signal } from '@angular/core';
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
  status: 'Em Andamento' | 'Encerrada' | 'Aguardando';
  pausado: boolean;
  motivoPausa?: string;
  tempoDecorrido: string;
  previsaoEntrega: string;
  qtdSolicitada: number;
  qtdProduzida: number;
}

@Component({
  selector: 'app-dashboard-op',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PoModule],
  templateUrl: './dashboard-op.html',
  styleUrl: './dashboard-op.css',
})
export class DashboardOpComponent implements OnInit, OnDestroy {
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

  // ── Mock Data ──
  ops: DashboardOP[] = [
    {
      op: '53243801001', produto: 'I1000227',
      descProduto: 'CHAPA PARALAMAS 3X45X595 4DIAM10',
      operacao: '01 - CORTE LASER', recurso: '2101 - CORTE LASER',
      operador: 'JEAN SILVA', status: 'Em Andamento', pausado: false,
      tempoDecorrido: '00:45:22', previsaoEntrega: '08/05/2026',
      qtdSolicitada: 10, qtdProduzida: 4,
    },
    {
      op: '53243801002', produto: 'B2000115',
      descProduto: 'SUPORTE FIXAÇÃO LATERAL M8',
      operacao: '02 - DOBRAMENTO', recurso: '3002 - DOBRADEIRA CNC',
      operador: 'MARCOS LIMA', status: 'Em Andamento', pausado: true, motivoPausa: 'Máquina Travada',
      tempoDecorrido: '01:12:08', previsaoEntrega: '09/05/2026',
      qtdSolicitada: 25, qtdProduzida: 14,
    },
    {
      op: '53243801003', produto: 'C3100009',
      descProduto: 'EIXO TRANSMISSÃO 50MM',
      operacao: '03 - TORNEAMENTO', recurso: '4001 - TORNO CNC',
      operador: 'ANA FERREIRA', status: 'Em Andamento', pausado: false,
      tempoDecorrido: '02:05:47', previsaoEntrega: '07/05/2026',
      qtdSolicitada: 6, qtdProduzida: 6,
    },
    {
      op: '53243801004', produto: 'A1050032',
      descProduto: 'TAMPA CAIXA REDUTORA',
      operacao: '01 - CORTE PLASMA', recurso: '2200 - PLASMA CNC',
      operador: 'ROBERTO SANTOS', status: 'Encerrada', pausado: false,
      tempoDecorrido: '03:22:15', previsaoEntrega: '06/05/2026',
      qtdSolicitada: 8, qtdProduzida: 8,
    },
    {
      op: '53243801005', produto: 'D4200007',
      descProduto: 'FLANGE ROSQUEADA 3/4 BSP',
      operacao: '04 - FRESAMENTO', recurso: '5001 - CENTRO USINAGEM',
      operador: '-', status: 'Aguardando', pausado: false,
      tempoDecorrido: '00:00:00', previsaoEntrega: '10/05/2026',
      qtdSolicitada: 15, qtdProduzida: 0,
    },
    {
      op: '53243801006', produto: 'E5300021',
      descProduto: 'BUCHA BRONZE FLANGEADA 30MM',
      operacao: '02 - TORNEAMENTO', recurso: '4002 - TORNO CONV.',
      operador: 'CARLOS MENDES', status: 'Encerrada', pausado: false,
      tempoDecorrido: '01:58:33', previsaoEntrega: '05/05/2026',
      qtdSolicitada: 20, qtdProduzida: 18,
    },
  ];

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
    this.recalcCounters();
    this.tickInterval = setInterval(() => this.tickTimers(), 1000);
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
    if (op.status === 'Encerrada') return false;
    const [d, m, y] = op.previsaoEntrega.split('/').map(Number);
    return new Date(y, m - 1, d) < new Date();
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
      if (op.status !== 'Em Andamento' || op.pausado) return op;
      const [h, m, s] = op.tempoDecorrido.split(':').map(Number);
      let total = h * 3600 + m * 60 + s + 1;
      const nh = Math.floor(total / 3600); total %= 3600;
      const nm = Math.floor(total / 60);
      const ns = total % 60;
      return {
        ...op,
        tempoDecorrido: `${String(nh).padStart(2,'0')}:${String(nm).padStart(2,'0')}:${String(ns).padStart(2,'0')}`,
      };
    });
  }
}
