import { Component, OnInit, OnDestroy, ViewChild, inject } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  PoModule,
  PoModalComponent,
  PoModalAction,
  PoNotificationService,
} from '@po-ui/ng-components';
import { ApontamentoService } from '../../../services/apontamento.service';
import { ApontamentoApiService } from '../../../services/apontamento-api.service';
import { ApontamentoStepIndicatorComponent } from '../step-indicator/apontamento-step-indicator.component';
import { NumericKeyboardComponent } from '../numeric-keyboard/numeric-keyboard.component';
import { ApontamentoPayload } from '../../../models/apontamento.model';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-apontamento-quantidade',
  standalone: true,
  imports: [FormsModule, PoModule, ApontamentoStepIndicatorComponent, NumericKeyboardComponent],
  templateUrl: './apontamento-quantidade.html',
  styleUrls: ['./apontamento-quantidade.css'],
})
export class ApontamentoQuantidadeComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  apontamentoService = inject(ApontamentoService);
  private apiService = inject(ApontamentoApiService);
  private notification = inject(PoNotificationService);

  @ViewChild('keyboardModal') keyboardModal!: PoModalComponent;
  @ViewChild('stopModal') stopModal!: PoModalComponent;
  @ViewChild('successModal') successModal!: PoModalComponent;

  quantityProduced = 0;
  loss = 0;
  activeField: 'quantity' | 'loss' | null = null;
  isApontando = false;

  stopPrimaryAction: PoModalAction = {
    label: 'Encerrar',
    danger: true,
    action: () => {
      this.apontamentoService.stopTimer();
      this.stopModal.close();
    },
  };

  stopSecondaryAction: PoModalAction = {
    label: 'Cancelar',
    action: () => this.stopModal.close(),
  };

  successAction: PoModalAction = {
    label: 'Concluir',
    action: () => {
      this.successModal.close();
      this.router.navigate(['/apontamento/resumo']);
    },
  };

  get canProceed(): boolean {
    if (this.isOpEncerrada()) return true;
    return this.quantityProduced > 0 || this.loss > 0;
  }

  isOpEncerrada(): boolean {
    return this.apontamentoService.data().apiData?.status === 'Enc. Total';
  }

  ngOnInit(): void {
    const data = this.apontamentoService.data();
    if (!data.opNumber || !data.operatorCode) {
      this.router.navigate(['/apontamento']);
      return;
    }
    if (data.quantityProduced) this.quantityProduced = parseFloat(data.quantityProduced);
    if (data.loss) this.loss = parseFloat(data.loss);
  }

  ngOnDestroy(): void {
    this.apontamentoService.updateData({
      quantityProduced: this.quantityProduced.toString(),
      loss: this.loss.toString(),
    });
  }

  startTimer(): void {
    this.apontamentoService.startTimer();
  }

  pauseTimer(): void {
    this.apontamentoService.pauseTimer();
  }
  
  resumeTimer(): void {
    this.apontamentoService.resumeTimer();
  }
  
  confirmStopTimer(): void {
    if (this.apontamentoService.elapsedTime() < 60) {
      this.notification.warning('Você só pode encerrar o apontamento após 1 minuto de operação.');
      return;
    }
    this.stopModal.open();
  }

  openKeyboard(field: 'quantity' | 'loss'): void {
    this.activeField = field;
    this.keyboardModal.open();
  }

  getActiveFieldValue(): string {
    return this.activeField === 'quantity'
      ? this.quantityProduced.toString()
      : this.loss.toString();
  }

  getActiveFieldLabel(): string {
    return this.activeField === 'quantity' ? 'Quantidade Produzida' : 'Perdas';
  }

  onKeyboardValueChange(value: string): void {
    const num = parseFloat(value) || 0;
    if (this.activeField === 'quantity') this.quantityProduced = num;
    else this.loss = num;
  }

  getQuantidadeSolicitada(): number {
    const data = this.apontamentoService.data();
    const op = data.apiData?.operacoes.find((o) => o.operac === data.operation);
    return op?.quantidadeSolicitada || data.apiData?.quantidade || 0;
  }

  getQuantidadeProduzida(): number {
    const data = this.apontamentoService.data();
    const op = data.apiData?.operacoes.find((o) => o.operac === data.operation);
    return op?.quantidadeProduzida || 0;
  }

  getQuantidadeFaltante(): number {
    return Math.max(0, this.getQuantidadeSolicitada() - this.getQuantidadeProduzida());
  }

  formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '';
    const clean = dateStr.replace(/\//g, '').trim();
    if (clean.length === 8)
      return `${clean.substring(6, 8)}/${clean.substring(4, 6)}/${clean.substring(0, 4)}`;
    return dateStr;
  }

  async handleApontar(): Promise<void> {
    if (!this.canProceed) return;

    if (this.isOpEncerrada() && this.quantityProduced === 0 && this.loss === 0) {
      this.apontamentoService.stopTimer();
      this.router.navigate(['/apontamento/resumo']);
      return;
    }

    setTimeout(() => {
      this.isApontando = true;
    });
    try {
      const data = this.apontamentoService.data();
      const startTime = this.apontamentoService.startTime();
      const endTime = this.apontamentoService.endTime();
      const startDate = startTime ? new Date(startTime) : new Date();
      const endDate = endTime ? new Date(endTime) : new Date();
      const parctotalValue = this.quantityProduced >= this.getQuantidadeFaltante() ? 'T' : 'P';

      const payload: ApontamentoPayload = {
        ORDEMPRODUCAO: data.opNumber,
        PRODUTO: data.apiData?.produto || '',
        OPERACAO: data.operation,
        RECURSO: data.selectedResource?.codigo || data.resource || '',
        FERRAMENTA: '',
        DATAINI: this.formatDateAPI(startDate),
        HORAINI: this.formatTimeAPI(startDate),
        DATAFIM: this.formatDateAPI(endDate),
        HORAFIM: this.formatTimeAPI(endDate),
        QUANTIDADE: this.quantityProduced,
        PERDA: this.loss,
        PARCTOTAL: parctotalValue,
        DATAAPONTAMENTO: this.formatDateAPI(new Date()),
        DESDOBRAMENTO: '',
        TEMPOREAL: 'S',
        LOTE: '',
        SUBLOTE: '',
        VALIDLOTE: '',
        OBSERVACAO: '',
        OPERADOR: data.operatorCode,
        PERDAANTERIOR: 0,
        SEQROTALT: data.apiData?.roteiroUtilizado || '',
        QTD2UM: 0,
        POTENCIA: 0,
        RATEIO: 0,
        STATUS: '',
        ARMAZEM: '',
        PERIMP: 0,
        QTDEGANHO: 0,
        NEST: data.apiData?.nest?.toString() || '',
      };

      const result = await firstValueFrom(this.apiService.apontarProducao(payload));
      if (result?.success) {
        this.apontamentoService.updateData({
          quantityProduced: this.quantityProduced.toString(),
          loss: this.loss.toString(),
        });
        this.apontamentoService.setHasApontado(true);
        await this.apontamentoService.fetchAndSetOPData(data.opNumber, false);
        this.successModal.open();
      } else {
        this.notification.error(
          result?.error || 'Erro no apontamento. Verifique os dados e tente novamente.',
        );
      }
    } catch {
      this.notification.error('Erro ao processar apontamento');
    } finally {
      this.isApontando = false;
    }
  }

  private formatDateAPI(date: Date): string {
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  }

  private formatTimeAPI(date: Date): string {
    const h = date.getHours().toString().padStart(2, '0');
    const m = date.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  }

  goBack(): void {
    this.router.navigate(['/apontamento/recurso']);
  }

  onStepClick(s: number): void {
    if (s === 1) this.router.navigate(['/apontamento']);
    if (s === 2) this.router.navigate(['/apontamento/recurso']);
  }
}
