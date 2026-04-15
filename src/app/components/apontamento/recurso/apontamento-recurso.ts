import { Component, OnInit, ViewChild, inject } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  PoModule,
  PoNotificationService,
  PoSelectOption,
  PoPageSlideComponent,
} from '@po-ui/ng-components';
import { ApontamentoService } from '../../../services/apontamento.service';
import { ApontamentoApiService } from '../../../services/apontamento-api.service';
import { ApontamentoStepIndicatorComponent } from '../step-indicator/apontamento-step-indicator.component';
import { Operacao, RecursoApontamento } from '../../../models/apontamento.model';

@Component({
  selector: 'app-apontamento-recurso',
  standalone: true,
  imports: [FormsModule, PoModule, ApontamentoStepIndicatorComponent],
  templateUrl: './apontamento-recurso.html',
  styleUrls: ['./apontamento-recurso.css'],
})
export class ApontamentoRecursoComponent implements OnInit {
  private router = inject(Router);
  apontamentoService = inject(ApontamentoService);
  private apiService = inject(ApontamentoApiService);
  private notification = inject(PoNotificationService);

  @ViewChild('saldoSheet', { static: true }) saldoSheet!: PoPageSlideComponent;
  @ViewChild('opDetailsSheet', { static: true }) opDetailsSheet!: PoPageSlideComponent;

  operacoes: Operacao[] = [];
  selectedOperation = '';
  useDefaultResource = true;
  selectedRecurso = '';
  recursos: RecursoApontamento[] = [];
  recursosOptions: PoSelectOption[] = [];
  selectedOpDetails: Operacao | null = null;

  get canProceed(): boolean {
    return !!(this.selectedOperation && (this.useDefaultResource || this.selectedRecurso));
  }

  ngOnInit(): void {
    const data = this.apontamentoService.data();
    console.log('[Recurso] Dados no estado global:', data);
    
    if (!data.opNumber || !data.operatorCode) {
      console.warn('[Recurso] OP ou Operador ausentes, redirecionando para login...');
      this.router.navigate(['/apontamento/login']);
      return;
    }
    this.operacoes = data.apiData?.operacoes || [];
    if (data.operation) {
      this.selectedOperation = data.operation;
    } else if (this.operacoes.length > 0) {
      const first = this.operacoes.find((op) => !op.encerrada);
      this.selectedOperation = first?.operac || this.operacoes[0].operac;
    }
    this.loadRecursos();
  }

  async loadRecursos(): Promise<void> {
    try {
      this.recursos = (await this.apiService.fetchRecursos().toPromise()) || [];
      this.recursosOptions = this.recursos.map((r) => ({
        label: `${r.codigo} - ${r.descricao}`,
        value: r.codigo,
      }));
    } catch (error) {
      console.error('Erro ao carregar recursos:', error);
      this.notification.warning(
        'Não foi possível carregar os recursos. Usando recurso padrão da operação.',
      );
    }
  }

  selectOperation(op: Operacao): void {
    this.selectedOperation = op.operac;
    this.useDefaultResource = true;
    this.selectedRecurso = '';
    if (op.encerrada) {
      this.selectedOpDetails = op;
      this.opDetailsSheet.open();
    }
  }

  getDefaultResource(): string {
    const op = this.operacoes.find((o) => o.operac === this.selectedOperation);
    return op?.recurso || 'Não definido';
  }

  handleNext(): void {
    if (!this.canProceed) return;
    this.apontamentoService.updateData({
      operation: this.selectedOperation,
      resource: this.useDefaultResource ? this.getDefaultResource() : this.selectedRecurso,
    });
    this.apontamentoService.startTimer();
    this.router.navigate(['/apontamento/quantidade']);
  }

  goBack(): void {
    this.router.navigate(['/apontamento']);
  }

  formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '';
    const clean = dateStr.replace(/\//g, '').trim();
    if (clean.length === 8 && /^\d+$/.test(clean)) {
      return `${clean.substring(6, 8)}/${clean.substring(4, 6)}/${clean.substring(0, 4)}`;
    }
    return dateStr;
  }

  onStepClick(step: number): void {
    if (step === 1) this.router.navigate(['/apontamento']);
  }
}
