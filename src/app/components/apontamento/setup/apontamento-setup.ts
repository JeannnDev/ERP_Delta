import { Component, OnInit, OnDestroy, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PoModule, PoNotificationService, PoModalComponent, PoModalAction } from '@po-ui/ng-components';

type SetupStatus = 'IDLE' | 'RUNNING' | 'PAUSED';

@Component({
  selector: 'app-apontamento-setup',
  standalone: true,
  imports: [CommonModule, FormsModule, PoModule],
  templateUrl: './apontamento-setup.html',
  styleUrls: ['./apontamento-setup.css'],
})
export class ApontamentoSetupComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private notification = inject(PoNotificationService);

  @ViewChild('pauseModal', { static: true }) pauseModal!: PoModalComponent;
  @ViewChild('finishModal', { static: true }) finishModal!: PoModalComponent;

  operatorName = '';
  recursoCode = '';
  recursoDescricao = '';
  status: SetupStatus = 'IDLE';
  secondsCounter = 0;
  timerInterval: ReturnType<typeof setInterval> | null = null;
  
  pauseReasons = [
    { label: 'Almoço / Lanche', value: 'almoco' },
    { label: 'Máquina em Manutenção', value: 'manutencao' },
    { label: 'Sem Recurso / Material', value: 'sem_recurso' },
    { label: 'Aguardando Ferramental', value: 'ferramental' },
    { label: 'Outros', value: 'outros' }
  ];
  selectedPauseReason = '';

  confirmPauseAction: PoModalAction = {
    action: () => {
      if (!this.selectedPauseReason) {
        this.notification.warning('Selecione um motivo de pausa!');
        return;
      }
      this.status = 'PAUSED';
      clearInterval(this.timerInterval ?? undefined);
      this.pauseModal.close();
      this.notification.information(`Setup pausado: Motivo registrado.`);
    },
    label: 'Confirmar Pausa',
    danger: true
  };

  cancelPauseAction: PoModalAction = {
    action: () => { this.pauseModal.close(); },
    label: 'Cancelar'
  };

  confirmFinishAction: PoModalAction = {
    action: () => {
      this.finishModal.close();
      this.finishSetupProcess();
    },
    label: 'Finalizar Setup',
  };

  cancelFinishAction: PoModalAction = {
    action: () => { this.finishModal.close(); },
    label: 'Voltar'
  };

  ngOnInit(): void {
    const operatorData = sessionStorage.getItem('setupOperator');
    if (!operatorData) {
      this.router.navigate(['/apontamento/setup-login']);
      return;
    }
    const operator = JSON.parse(operatorData);
    this.operatorName = operator.name || operator.code || 'Operador';
    this.recursoCode = operator.recurso || '';
    this.recursoDescricao = operator.recursoDescricao || '';
  }

  get formattedTime(): string {
    const h = Math.floor(this.secondsCounter / 3600).toString().padStart(2, '0');
    const m = Math.floor((this.secondsCounter % 3600) / 60).toString().padStart(2, '0');
    const s = (this.secondsCounter % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  get statusLabel(): string {
    switch (this.status) {
      case 'IDLE': return 'AGUARDANDO INÍCIO';
      case 'RUNNING': return 'EM PREPARAÇÃO / SETUP';
      case 'PAUSED': return 'SETUP PAUSADO';
    }
  }

  startTimer(): void {
    this.selectedPauseReason = '';
    this.status = 'RUNNING';
    
    // Se estava parado (Zero), garante limpo, se estava pausado ele continua
    if (!this.timerInterval && this.secondsCounter === 0) {
      this.secondsCounter = 0;
    }
    
    clearInterval(this.timerInterval ?? undefined);
    this.timerInterval = setInterval(() => {
      this.secondsCounter++;
    }, 1000);
  }

  openPauseModal(): void {
    this.selectedPauseReason = '';
    this.pauseModal.open();
  }

  openFinishModal(): void {
    this.finishModal.open();
  }

  finishSetupProcess(): void {
    clearInterval(this.timerInterval ?? undefined);
    this.notification.success(`Setup finalizado com sucesso! Tempo total gerado: ${this.formattedTime}`);
    sessionStorage.removeItem('setupOperator');
    this.router.navigate(['/apontamento']);
  }

  logout(): void {
    clearInterval(this.timerInterval ?? undefined);
    sessionStorage.removeItem('setupOperator');
    this.router.navigate(['/apontamento']);
  }

  ngOnDestroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }
}
