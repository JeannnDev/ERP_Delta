import { Component, OnInit, ViewChild, inject } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  PoModule,
  PoModalComponent,
  PoModalAction,
  PoNotificationService,
  PoSelectOption,
  PoTableColumn,
} from '@po-ui/ng-components';
import { ApontamentoService } from '../../../services/apontamento.service';
import { ApontamentoApiService } from '../../../services/apontamento-api.service';
import { ApontamentoStepIndicatorComponent } from '../step-indicator/apontamento-step-indicator.component';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-apontamento-resumo',
  standalone: true,
  imports: [FormsModule, PoModule, ApontamentoStepIndicatorComponent],
  templateUrl: './apontamento-resumo.html',
  styleUrls: ['./apontamento-resumo.css'],
})
export class ApontamentoResumoComponent implements OnInit {
  private router = inject(Router);
  public apontamentoService = inject(ApontamentoService);
  private apiService = inject(ApontamentoApiService);
  private notification = inject(PoNotificationService);

  @ViewChild('newOpModal') newOpModal!: PoModalComponent;
  @ViewChild('printSuccessModal') printSuccessModal!: PoModalComponent;
  @ViewChild('printErrorModal') printErrorModal!: PoModalComponent;

  operacoesColumns: PoTableColumn[] = [
    { property: 'operac', label: 'Op', width: '60px' },
    { property: 'descricao', label: 'Descrição' },
    { property: 'recurso', label: 'Máquina', width: '100px' },
    { property: 'quantidadeProduzida', label: 'Prod', width: '80px', type: 'number' },
    { property: 'quantidadeSolicitada', label: 'Solic', width: '80px', type: 'number' },
    { property: 'status', label: 'Status', width: '110px' },
  ];

  printersOptions: PoSelectOption[] = [];
  labelsOptions: PoSelectOption[] = [];
  selectedPrinter = '';
  selectedLabel = '';
  printQuantity = 1;
  isPrinting = false;
  printErrorMessage = '';
  expandedOps: Record<number, boolean> = { 0: true };

  newOpPrimaryAction: PoModalAction = {
    label: 'Nova OP',
    action: () => {
      this.newOpModal.close();
      this.apontamentoService.reset('/apontamento');
    },
  };

  newOpSecondaryAction: PoModalAction = {
    label: 'Cancelar',
    action: () => this.newOpModal.close(),
  };

  printSuccessAction: PoModalAction = {
    label: 'OK',
    action: () => this.printSuccessModal.close(),
  };

  printErrorAction: PoModalAction = {
    label: 'Fechar',
    action: () => this.printErrorModal.close(),
  };

  get canPrint(): boolean {
    return !!(this.selectedPrinter && this.selectedLabel && this.printQuantity > 0);
  }

  ngOnInit(): void {
    const data = this.apontamentoService.data();
    if (!data.opNumber || !data.operatorCode) {
      this.router.navigate(['/apontamento']);
      return;
    }
    this.loadImpressoras();
    this.loadEtiquetas();
  }

  async loadImpressoras(): Promise<void> {
    try {
      const printers = await firstValueFrom(this.apiService.fetchImpressoras());
      this.printersOptions = (printers || []).map((p) => ({
        label: p.name,
        value: p.zplId || p.id,
      }));
    } catch {
      /* ignore */
    }
  }

  async loadEtiquetas(): Promise<void> {
    try {
      const labels = await firstValueFrom(this.apiService.fetchEtiquetas());
      this.labelsOptions = (labels || []).map((l) => ({ label: l.name, value: l.id }));
    } catch {
      /* ignore */
    }
  }

  isOpEncerrada(): boolean {
    return this.apontamentoService.data().apiData?.status === 'Enc. Total';
  }

  async handlePrint(): Promise<void> {
    if (!this.canPrint) return;
    this.isPrinting = true;
    try {
      const result = await firstValueFrom(
        this.apiService.imprimirEtiqueta({
          Op: this.apontamentoService.data().opNumber,
          IdZpl: this.selectedPrinter,
          Quant: this.printQuantity,
          Layout: this.selectedLabel,
        }),
      );
      if (result?.success) this.printSuccessModal.open();
      else {
        this.printErrorMessage = result?.error || 'Erro ao imprimir';
        this.printErrorModal.open();
      }
    } catch (e: unknown) {
      this.printErrorMessage = (e instanceof Error ? e.message : null) || 'Erro ao imprimir';
      this.printErrorModal.open();
    } finally {
      this.isPrinting = false;
    }
  }

  handleNovaOP(): void {
    this.newOpModal.open();
  }
  goBack(): void {
    if (this.isOpEncerrada()) {
      this.router.navigate(['/apontamento/recurso']);
    } else {
      this.router.navigate(['/apontamento/quantidade']);
    }
  }

  onStepClick(s: number): void {
    if (s === 1) this.router.navigate(['/apontamento']);
    if (s === 2) this.router.navigate(['/apontamento/recurso']);
    if (s === 3 && !this.isOpEncerrada()) {
      this.router.navigate(['/apontamento/quantidade']);
    }
  }

  toggleOp(index: number): void {
    this.expandedOps[index] = !this.expandedOps[index];
  }

  getQuantidadePerdidaTotal(): number {
    const data = this.apontamentoService.data();
    if (!data.apiData?.operacoes) return 0;
    return data.apiData.operacoes.reduce((acc, op) => acc + (op.quantidadePerdida || 0), 0);
  }

  getOperationTime(op: { historico?: { tempoApont: string | number }[] }): string {
    if (!op.historico) return '00:00:00';
    const totalSeconds = op.historico.reduce(
      (acc, hist) => acc + this.parseTimeToSeconds(hist.tempoApont),
      0,
    );
    return this.formatSecondsToTime(totalSeconds);
  }

  getTotalOpTimeFormatted(): string {
    const ops = this.apontamentoService.data().apiData?.operacoes || [];
    let totalSeconds = 0;
    ops.forEach((op) => {
      if (op.historico) {
        op.historico.forEach((hist) => {
          totalSeconds += this.parseTimeToSeconds(hist.tempoApont);
        });
      }
    });
    return this.formatSecondsToTime(totalSeconds);
  }

  formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '';
    const clean = dateStr.replace(/\//g, '').trim();
    if (clean.length === 8 && /^\d+$/.test(clean)) {
      return `${clean.substring(6, 8)}/${clean.substring(4, 6)}/${clean.substring(0, 4)}`;
    }
    return dateStr;
  }

  formatDateWithTime(dt: string, hr: string): string {
    if (!dt || !hr) return '-';
    return `${this.formatDate(dt)} ${hr}`;
  }

  formatTimeValue(val: string | number): string {
    const seconds = this.parseTimeToSeconds(val);
    return this.formatSecondsToTime(seconds);
  }

  getOperadorName(hist: { operadorNome?: string; operadorCod?: string }): string {
    if (hist.operadorNome) return hist.operadorNome;
    if (hist.operadorCod) {
      const ops = this.apontamentoService.operadores();
      const found = ops.find((o) => o['codigo'] === hist.operadorCod);
      return found ? (found['nome'] as string) : hist.operadorCod || '-';
    }
    return '-';
  }

  private parseTimeToSeconds(time: string | number): number {
    if (typeof time === 'number') return time;
    if (!time || typeof time !== 'string' || !time.includes(':')) return 0;
    const parts = time.split(':');
    if (parts.length === 3) return +parts[0] * 3600 + +parts[1] * 60 + +parts[2];
    if (parts.length === 2) return +parts[0] * 3600 + +parts[1] * 60;
    return 0;
  }

  private formatSecondsToTime(seconds: number): string {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}
