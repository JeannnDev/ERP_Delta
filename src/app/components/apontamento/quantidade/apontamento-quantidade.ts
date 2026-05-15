import { Component, OnInit, OnDestroy, ViewChild, inject, ChangeDetectorRef, effect } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  PoModule,
  PoModalComponent,
  PoModalAction,
  PoNotificationService,
  PoPageSlideModule,
  PoPageSlideComponent,
  PoPageModule,
} from '@po-ui/ng-components';
import { ApontamentoService } from '../../../services/apontamento.service';
import { ApontamentoApiService } from '../../../services/apontamento-api.service';
import { ApontamentoStepIndicatorComponent } from '../step-indicator/apontamento-step-indicator.component';
import { NumericKeyboardComponent } from '../numeric-keyboard/numeric-keyboard.component';
import { ApontamentoPayload, RecursoApontamento } from '../../../models/apontamento.model';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-apontamento-quantidade',
  standalone: true,
  imports: [
    FormsModule,
    PoModule,
    PoPageSlideModule,
    PoPageModule,
    ApontamentoStepIndicatorComponent,
    NumericKeyboardComponent
  ],
  templateUrl: './apontamento-quantidade.html',
  styleUrls: ['./apontamento-quantidade.css'],
})
export class ApontamentoQuantidadeComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  apontamentoService = inject(ApontamentoService);
  private apiService = inject(ApontamentoApiService);
  private notification = inject(PoNotificationService);
  private hideNotification = false;
  private cdr = inject(ChangeDetectorRef);

  constructor() {
    // Recarrega o histórico sempre que a OP ou Operação mudar
    effect(async () => {
      const op = this.apontamentoService.data().opNumber;
      const oper = this.apontamentoService.data().operation;
      if (op && oper) {
        await this.apontamentoService.loadCtrlTempoHistory(op, oper);
      }
    });
  }

  @ViewChild('stopModal') stopModal!: PoModalComponent;
  @ViewChild('successModal') successModal!: PoModalComponent;
  @ViewChild('pauseReasonModal') pauseReasonModal!: PoModalComponent;
  @ViewChild('resourceSheet') resourceSheet!: PoPageSlideComponent;

  quantityProduced = 0;
  loss = 0;
  activeField: 'quantity' | 'loss' | 'resource' | 'NF' | null = null;
  isApontando = false;
  showKeyboard = false;

  // Estado para Troca de Recurso
  resources: RecursoApontamento[] = [];
  filteredResources: RecursoApontamento[] = [];
  resourceSearch = '';
  isLoadingResources = false;
  isProcessingEvent = false;

  // Estado para NF
  tempNF = '';

  // Controle de Motivos de Pausa
  selectedPauseReason = 'Banheiro';
  customPauseReason = '';
  readonly pauseReasonOptions = [
    { label: 'Banheiro', value: 'Banheiro' },
    { label: 'Café', value: 'Café' },
    { label: 'Almoço', value: 'Almoço' },
    { label: 'Máquina em manutenção', value: 'Máquina em manutenção' },
    { label: 'Falta de Recurso', value: 'Falta de Recurso' },
    { label: 'Outros (Descrever)', value: 'Outros' }
  ];

  confirmPauseAction: PoModalAction = {
    label: 'Confirmar Pausa',
    action: () => this.confirmarPausa(),
    danger: true
  };

  cancelPauseAction: PoModalAction = {
    label: 'Cancelar',
    action: () => this.pauseReasonModal.close()
  };

  stopPrimaryAction: PoModalAction = {
    label: 'CONFIRMAR ENCERRAMENTO',
    danger: true,
    action: () => {
      this.stopModal.close();
      this.handleFinalizar();
    },
  };

  stopSecondaryAction: PoModalAction = {
    label: 'CANCELAR / VOLTAR',
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

  get canEditQuantity(): boolean {
    // Só permite editar se a operação NÃO estiver encerrada no Protheus 
    // E se o cronômetro estiver em execução (RUNNING)
    return !this.isOpEncerrada() && this.apontamentoService.currentTempoStatus() === 'RUNNING';
  }

  async ngOnInit() {
    const data = this.apontamentoService.data();
    if (!data.opNumber || !data.operatorCode) {
      this.router.navigate(['/apontamento/login']);
      return;
    }
    if (data.quantityProduced) this.quantityProduced = parseFloat(data.quantityProduced);
    if (data.loss) this.loss = parseFloat(data.loss);
    
    console.log('[QuantidadeComponent] ngOnInit disparado.');
    
    this.tempNF = data.apiData?.nf || '';
    
    // Sincroniza o histórico de tempo (SZT010) ao entrar na tela
    this.apontamentoService.loadCtrlTempoHistory().then(() => {
      console.log('[QuantidadeComponent] Histórico sincronizado.');
    });

    this.loadResources();
  }

  ngOnDestroy(): void {
    this.apontamentoService.updateData({
      quantityProduced: this.quantityProduced.toString(),
      loss: this.loss.toString(),
    });
  }

  private async loadResources() {
    this.isLoadingResources = true;
    try {
      this.resources = await firstValueFrom(this.apiService.fetchRecursosAll());
      this.filteredResources = [...this.resources];
    } catch {
      this.notification.error('Erro ao carregar recursos.');
    } finally {
      this.isLoadingResources = false;
      this.cdr.detectChanges();
    }
  }

  filterResources() {
    const search = this.resourceSearch.toLowerCase().trim();
    this.filteredResources = this.resources.filter(r => 
      r.codigo.toLowerCase().includes(search) || 
      r.descricao.toLowerCase().includes(search)
    );
  }

  openResourceSheet() {
    if (this.isOpEncerrada()) return;
    this.resourceSheet.open();
    this.resourceSearch = '';
    this.filteredResources = [...this.resources];
  }

  selectResource(resource: RecursoApontamento) {
    this.apontamentoService.updateData({ selectedResource: resource });
    this.resourceSheet.close();
    this.notification.success(`Recurso alterado para: ${resource.codigo}`);
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

  async handleIniciar(): Promise<void> {
    if (this.isProcessingEvent) return;
    this.isProcessingEvent = true;
    try {
      const success = await this.apontamentoService.registerCtrlTempoEvent('INICIO');
      if (success) {
        this.notification.success('Operação iniciada com sucesso!');
        this.apontamentoService.reset();
        setTimeout(() => this.router.navigate(['/apontamento/login']), 100);
      }
    } finally {
      this.isProcessingEvent = false;
    }
  }

  async handlePausar(): Promise<void> {
    if (this.isProcessingEvent) return;
    this.selectedPauseReason = 'Banheiro';
    this.customPauseReason = '';
    this.pauseReasonModal.open();
  }

  async confirmarPausa(): Promise<void> {
    let finalReason = this.selectedPauseReason;

    if (this.selectedPauseReason === 'Outros') {
      if (!this.customPauseReason.trim()) {
        this.notification.warning('Por favor, descreva o motivo no campo abaixo.');
        return;
      }
      finalReason = this.customPauseReason;
    } else if (this.customPauseReason.trim()) {
      finalReason = `${this.selectedPauseReason} - ${this.customPauseReason}`;
    }

    this.pauseReasonModal.close();
    this.isProcessingEvent = true;
    
    try {
      const success = await this.apontamentoService.registerCtrlTempoEvent('PAUSA', finalReason);
      if (success) {
        this.notification.success(`Pausa registrada: ${finalReason}`);
        this.apontamentoService.reset();
        setTimeout(() => this.router.navigate(['/apontamento/login']), 100);
      }
    } finally {
      this.isProcessingEvent = false;
      this.cdr.detectChanges();
    }
  }

  async handleFinalizar(): Promise<void> {
    if (this.isProcessingEvent) return;
    this.isProcessingEvent = true;
    try {
      // Calcula o tempo efetivo (Líquido) antes de fechar
      const history = this.apontamentoService.ctrlTempoHistory();
      const netTimeSeconds = this.apontamentoService.calculateNetProductionTime(history);
      
      const success = await this.apontamentoService.registerCtrlTempoEvent('FIM', '', netTimeSeconds);
      if (success) {
        this.notification.success('Tempo finalizado com sucesso!');
        // Para o cronômetro local para visualização
        this.apontamentoService.stopTimer(); 
        // Não resetamos aqui para permitir o preenchimento das quantidades finais
      }
    } finally {
      this.isProcessingEvent = false;
    }
  }

  confirmStopTimer(): void {
    if (this.apontamentoService.elapsedTime() < 60) {
      this.notification.warning('Você só pode encerrar o apontamento após 1 minuto de operação.');
      return;
    }
    this.stopModal.open();
  }

  openKeyboard(field: 'quantity' | 'loss' | 'resource' | 'NF'): void {
    if (this.isOpEncerrada() && (field === 'quantity' || field === 'loss')) return;
    this.activeField = field;
    this.showKeyboard = true;
    this.cdr.detectChanges();
  }

  adjustQuantity(amount: number): void {
    const newVal = this.quantityProduced + amount;
    this.quantityProduced = newVal < 0 ? 0 : newVal;
    this.cdr.detectChanges();
  }

  adjustLoss(amount: number): void {
    const newVal = this.loss + amount;
    this.loss = newVal < 0 ? 0 : newVal;
    this.cdr.detectChanges();
  }

  getActiveFieldValue(): string {
    if (this.activeField === 'quantity') return this.quantityProduced.toString();
    if (this.activeField === 'loss') return this.loss.toString();
    if (this.activeField === 'resource') return this.resourceSearch;
    if (this.activeField === 'NF') return this.tempNF;
    return '';
  }

  getActiveFieldLabel(): string {
    if (this.activeField === 'quantity') return 'Quantidade Produzida';
    if (this.activeField === 'loss') return 'Perdas';
    if (this.activeField === 'resource') return 'Filtrar Recurso';
    if (this.activeField === 'NF') return 'Informe a NF';
    return '';
  }

  getActiveFieldMaxLength(): number {
    if (this.activeField === 'NF') return 9;
    if (this.activeField === 'resource') return 15;
    return 12; // Padrão para quantidade e perdas
  }

  onKeyboardValueChange(value: string): void {
    const maxLength = this.getActiveFieldMaxLength();
    const truncatedValue = value.substring(0, maxLength);
    
    if (this.activeField === 'quantity') this.quantityProduced = parseFloat(truncatedValue) || 0;
    else if (this.activeField === 'loss') this.loss = parseFloat(truncatedValue) || 0;
    else if (this.activeField === 'resource') {
      this.resourceSearch = truncatedValue;
      this.filterResources();
    }
    else if (this.activeField === 'NF') this.tempNF = truncatedValue;
  }

  async onKeyboardConfirm() {
    this.showKeyboard = false;
    if (this.activeField === 'NF') {
      await this.updateNF();
    }
  }

  async updateNF() {
    const op = this.apontamentoService.data().opNumber;
    if (!op || this.isApontando) return;

    this.isApontando = true;
    try {
      const res = await firstValueFrom(this.apiService.updateNF(op, this.tempNF));
      if (res.success) {
        this.notification.success('NF atualizada com sucesso!');
        // Atualiza os dados locais da OP para refletir a nova NF
        await this.apontamentoService.fetchAndSetOPData(op, false);
      } else {
        this.notification.error(res.error || 'Erro ao atualizar NF.');
      }
    } catch {
      this.notification.error('Falha na conexão ao atualizar NF.');
    } finally {
      this.isApontando = false;
      this.cdr.detectChanges();
    }
  }

  getCurrentResourceCode(): string {
    const data = this.apontamentoService.data();
    return data.selectedResource?.codigo || data.resource || '-';
  }

  getCurrentResourceDesc(): string {
    const data = this.apontamentoService.data();
    return data.selectedResource?.descricao || (data.apiData?.operacoes.find(o => o.operac === data.operation)?.descricao) || '-';
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

    this.isApontando = true;
    try {
      const data = this.apontamentoService.data();
      const startTime = this.apontamentoService.startTime();
      const endTime = this.apontamentoService.endTime();
      const startDate = startTime ? new Date(startTime) : new Date();
      const endDate = endTime ? new Date(endTime) : new Date();
      
      const totalSeconds = this.apontamentoService.elapsedTime();
      const h = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
      const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
      const tempoFormatado = `${h}:${m}`;

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
        TEMPOREAL: tempoFormatado,
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
        this.notification.error(result?.error || 'Erro no apontamento.');
      }
    } catch {
      this.notification.error('Erro ao processar apontamento');
    } finally {
      this.isApontando = false;
      this.cdr.detectChanges();
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
    if (s === 1) this.router.navigate(['/apontamento/login']);
    if (s === 2) this.router.navigate(['/apontamento/recurso']);
  }
}
