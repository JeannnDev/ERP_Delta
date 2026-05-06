import { Component, OnInit, ViewChild, inject, ChangeDetectorRef } from '@angular/core';

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
import { PasswordKeyboardComponent } from '../password-keyboard/password-keyboard.component';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-apontamento-login',
  standalone: true,
  imports: [FormsModule, PoModule, ApontamentoStepIndicatorComponent, NumericKeyboardComponent, PasswordKeyboardComponent],
  templateUrl: './apontamento-login.html',
  styleUrls: ['./apontamento-login.css'],
})
export class ApontamentoLoginComponent implements OnInit {
  private router = inject(Router);
  public apontamentoService = inject(ApontamentoService);
  private apiService = inject(ApontamentoApiService);
  private notification = inject(PoNotificationService);
  private cdr = inject(ChangeDetectorRef);

  @ViewChild('keyboardModal') keyboardModal!: PoModalComponent;
  @ViewChild('passwordModal') passwordModal!: PoModalComponent;
  @ViewChild('scannerModal') scannerModal!: PoModalComponent;
  @ViewChild('operatorNotFoundModal') operatorNotFoundModal!: PoModalComponent;
  @ViewChild('incorrectPasswordModal') incorrectPasswordModal!: PoModalComponent;
  @ViewChild('errorModal') errorModal!: PoModalComponent;
  @ViewChild('opEncerradaModal') opEncerradaModal!: PoModalComponent;

  opNumber = '';
  operatorCode = '';
  operatorPassword = '';
  isOperatorConfirmed = false;
  isLoading = false;
  isValidating = false;
  errorMessage = '';
  activeField: 'op' | 'operator' | 'password' | null = null;
  scannerSimulatorValue = '';

  operatorNotFoundAction: PoModalAction = {
    label: 'Entendi',
    action: () => this.operatorNotFoundModal.close(),
  };

  incorrectPasswordAction: PoModalAction = {
    label: 'Entendi',
    action: () => this.incorrectPasswordModal.close(),
  };

  errorAction: PoModalAction = {
    label: 'Fechar',
    action: () => this.errorModal.close(),
  };

  get canProceed(): boolean {
    return !!(
      this.opNumber?.trim() &&
      this.operatorCode?.trim() &&
      this.operatorPassword?.trim() &&
      !this.isLoading &&
      !this.isValidating
    );
  }

  ngOnInit(): void {
    // Apenas limpa o estado, sem redirecionar ou recarregar a página forçadamente
    this.apontamentoService.reset(null);
    this.opNumber = '';
    this.operatorCode = '';
    this.operatorPassword = '';
    this.isOperatorConfirmed = false;
  }

  onOpEnter(): void {
    if (this.opNumber?.trim() && this.operatorCode?.trim() && this.operatorPassword?.trim()) {
      this.handleNext();
    }
  }

  onOperatorCodeChange(value: string): void {
    if (!value) return;

    // Detecta JSON de crachá
    if (value.trim().startsWith('{') && value.trim().endsWith('}')) {
      try {
        const parsed = JSON.parse(value) as { codigo?: string; senha?: string };
        if (parsed.codigo) {
          this.operatorCode = parsed.codigo;
          this.isOperatorConfirmed = true;
          if (parsed.senha) {
            this.operatorPassword = parsed.senha;
            this.scannerModal?.close();
            setTimeout(() => this.handleNext(), 100);
          }
        }
      } catch {
        /* ignore */
      }
      return;
    }

    // Detecta Formato Pipe Protheus
    if (value.includes('COD=') && value.includes('|')) {
      const parts = value.split('|');
      let cod = '';
      let senha = '';
      for (const part of parts) {
        if (part.startsWith('COD=')) cod = part.replace('COD=', '').trim();
        if (part.startsWith('SENHA=')) senha = part.replace('SENHA=', '').trim();
      }
      if (cod) {
        this.operatorCode = cod;
        this.isOperatorConfirmed = true;
        if (senha) {
          this.operatorPassword = senha;
          this.scannerModal?.close();
          setTimeout(() => this.handleNext(), 100);
        }
      }
      return;
    }

    if (value.length >= 6) {
      this.isOperatorConfirmed = true;
    } else {
      this.isOperatorConfirmed = false;
    }
  }

  onOperatorEnter(): void {
    if (this.operatorCode?.trim()) {
      this.isOperatorConfirmed = true;
    }
  }

  onPasswordEnter(): void {
    if (this.operatorPassword?.trim()) {
      this.handleNext();
    }
  }

  isMobileDev(): boolean {
    return window.innerWidth < 768;
  }

  openDeviceSpecificInput(field: 'op' | 'operator' | 'password'): void {
    this.activeField = field;
    if (this.isMobileDev() && (field === 'op' || field === 'operator')) {
      this.scannerSimulatorValue = '';
      this.scannerModal.open();
    } else {
      this.keyboardModal.open();
    }
  }

  openPasswordKeyboard(): void {
    this.passwordModal.open();
  }

  onPasswordKeyboardConfirm(): void {
    this.passwordModal.close();
    if (this.operatorPassword?.trim()) {
      this.handleNext();
    }
  }

  onScannerSimulatorEnter(value: string): void {
    this.scannerModal.close();
    this.cdr.detectChanges(); // Garante que o modal fechou na UI
    if (this.activeField === 'op') {
      this.opNumber = value;
      this.onOpEnter();
    } else if (this.activeField === 'operator') {
      this.operatorCode = value;
      this.onOperatorCodeChange(value);
    }
  }

  getActiveFieldValue(): string {
    switch (this.activeField) {
      case 'op':
        return this.opNumber;
      case 'operator':
        return this.operatorCode;
      case 'password':
        return this.operatorPassword;
      default:
        return '';
    }
  }

  getActiveFieldLabel(): string {
    switch (this.activeField) {
      case 'op':
        return 'Ordem de Produção';
      case 'operator':
        return 'Código do Operador';
      case 'password':
        return 'Senha do Operador';
      default:
        return 'Informe o valor';
    }
  }

  onKeyboardValueChange(value: string): void {
    switch (this.activeField) {
      case 'op':
        this.opNumber = value;
        break;
      case 'operator':
        this.operatorCode = value;
        break;
      case 'password':
        this.operatorPassword = value;
        break;
    }
  }

  onKeyboardConfirm(): void {
    this.keyboardModal.close();
    if (this.activeField === 'operator' && this.operatorCode?.trim()) {
      this.isOperatorConfirmed = true;
    }
  }

  onProsseguirParaConsulta(): void {
    this.opEncerradaModal.close();
    this.router.navigate(['/apontamento/recurso']);
  }

  async handleNext(): Promise<void> {
    if (!this.opNumber?.trim()) {
      this.notification.warning('Por favor, digite o número da OP');
      return;
    }
    if (!this.operatorCode?.trim()) {
      this.notification.warning('Por favor, digite o código do operador');
      return;
    }
    if (!this.operatorPassword?.trim()) {
      this.notification.warning('Por favor, digite a senha do operador');
      return;
    }

    this.isValidating = true;
    this.isLoading = true;

    // Atualizamos os dados no Service
    this.apontamentoService.updateData({
      opNumber: this.opNumber,
      operatorCode: this.operatorCode,
      operatorPassword: this.operatorPassword
    });

    try {
      // 1. Validamos o operador primeiro (essencial para o nome e permissão)
      const validation = await firstValueFrom(
        this.apiService.validateOperador(
          this.operatorCode,
          this.operatorPassword,
          this.apontamentoService.operadores(),
        )
      );

      if (!validation?.success) {
        this.isValidating = false;
        this.isLoading = false;
        this.cdr.detectChanges();
        
        if (validation?.error === 'Senha incorreta') {
          this.incorrectPasswordModal.open();
        } else if (validation?.error === 'Operador não encontrado') {
          this.operatorNotFoundModal.open();
        } else {
          this.errorMessage = validation?.error || 'Falha na validação do operador';
          this.errorModal.open();
        }
        return;
      }

      // 2. Se o operador está OK, atualizamos o nome e buscamos a OP
      this.apontamentoService.updateData({
        operatorName: validation.data?.nome || '',
      });

      // Primeira tentativa de buscar a OP
      let opResult = await this.apontamentoService.fetchAndSetOPData(
        this.opNumber,
        true,
        this.operatorCode,
        this.operatorPassword
      );

      // Se falhou, aguarda 2s e tenta novamente (cold-start do Protheus)
      // Cobre todos os casos: erros HTTP, dados incompletos, saldo vazio, etc.
      if (!opResult.success) {
        console.warn('[Login] 1ª tentativa falhou. Retry em 2s (cold-start Protheus)...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Reseta sinais de erro do service para não mostrar diálogos antigos
        this.apontamentoService.setShowGenericErrorDialog(false);
        this.apontamentoService.setShowError404Dialog(false);
        this.apontamentoService.setShowSemSaldoDialog(false);
        this.apontamentoService.setShowNoOperationsDialog(false);

        opResult = await this.apontamentoService.fetchAndSetOPData(
          this.opNumber,
          true,
          this.operatorCode,
          this.operatorPassword
        );
        console.log('[Login] Resultado após retry:', opResult.success ? 'Sucesso ✓' : 'Falhou novamente');
      }

      if (opResult.success) {
        console.log('[Login] Sucesso na busca da OP. Verificando status...');
        if (opResult.isOpEncerrada) {
          this.isLoading = false;
          this.isValidating = false;
          this.cdr.detectChanges();
          this.opEncerradaModal.open();
          return;
        }

        const targetPath = !opResult.skipToSummary ? '/apontamento/recurso' : '/apontamento/resumo';
        this.router.navigate([targetPath]);
      } else {
        console.error('[Login] Ambas tentativas falharam.');
        setTimeout(() => {
          this.isValidating = false;
          this.isLoading = false;
          this.errorMessage = this.apontamentoService.genericErrorMessage() || 'Erro ao validar dados da OP no Protheus';
          this.cdr.detectChanges();
          this.errorModal.open();
        }, 0);
      }
    } catch (error) {
      console.error('[Login] Erro crítico no handleNext:', error);
      setTimeout(() => {
        this.isValidating = false;
        this.isLoading = false;
        this.errorMessage = 'Erro ao processar requisição. Verifique a conexão com o Protheus.';
        this.cdr.detectChanges();
        this.errorModal.open();
      }, 0);
    }
  }

  goBack(): void {
    this.router.navigate(['/apontamento']);
  }

  onStepClick(): void {
    // Step 1 = login, não navega para trás
  }
}
