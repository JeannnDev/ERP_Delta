import { Component, OnInit, inject, ViewChild, ChangeDetectorRef } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  PoModule,
  PoNotificationService,
  PoModalComponent,
  PoModalAction,
  PoSelectOption,
  PoLoadingModule,
} from '@po-ui/ng-components';
import { ApontamentoApiService } from '../../services/apontamento-api.service';
import { ApontamentoService } from '../../services/apontamento.service';
import { NumericKeyboardComponent } from '../apontamento/numeric-keyboard/numeric-keyboard.component';
import { PasswordKeyboardComponent } from '../apontamento/password-keyboard/password-keyboard.component';
import { OPApiData, ImpressaoPayload, ApontamentoApiResponse } from '../../models/apontamento.model';
import { firstValueFrom, timeout } from 'rxjs';

@Component({
  selector: 'app-etiqueta',
  standalone: true,
  imports: [CommonModule, FormsModule, PoModule, PoLoadingModule, NumericKeyboardComponent, PasswordKeyboardComponent],
  templateUrl: './etiqueta.html',
  styleUrls: ['./etiqueta.css'],
})
export class EtiquetaComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);
  private notification = inject(PoNotificationService);
  private apiService = inject(ApontamentoApiService);
  public apontamentoService = inject(ApontamentoService);

  @ViewChild('nfModal', { static: true }) nfModal!: PoModalComponent;
  @ViewChild('loginModal') loginModal!: PoModalComponent;

  // Estado da OP
  opSearch = '';
  isLoading = false;
  opData: OPApiData | null = null;

  // Estado da NF
  tempNF = '';
  
  // Impressão
  quantidade = 1;
  selectedPrinter = '';
  selectedLayout = '';
  printers: PoSelectOption[] = [];
  layouts: PoSelectOption[] = [];

  // Teclado Numérico
  showKeyboard = false;
  showPasswordKeyboard = false;
  keyboardValue = '';
  keyboardTarget: 'OP' | 'NF' | 'QUANT' | 'OPERATOR' | 'PASSWORD' = 'OP';

  // Login
  operatorCode = '';
  operatorPassword = '';
  isLoggedIn = false;
  isValidatingLogin = false;
  pendingAction: (() => void) | null = null;

  confirmNFAction: PoModalAction = {
    action: () => this.updateNF(),
    label: 'Confirmar Alteração',
  };

  closeNFAction: PoModalAction = {
    action: () => this.nfModal.close(),
    label: 'Cancelar',
  };

  confirmLoginAction: PoModalAction = {
    label: 'Entrar',
    action: () => this.handleLogin(),
  };

  cancelLoginAction: PoModalAction = {
    label: 'Cancelar',
    action: () => {
      this.loginModal.close();
      this.pendingAction = null;
    }
  };

  ngOnInit(): void {
    // Não setamos isLoggedIn = true automaticamente para garantir que o modal apareça
    // se o usuário quiser se identificar novamente ou se for a primeira ação na tela.
    const data = this.apontamentoService.data();
    if (data.operatorCode) {
      this.operatorCode = data.operatorCode;
      this.operatorPassword = data.operatorPassword || '';
    }

    this.loadPrinters();
    this.loadLayouts();
    this.restoreSettings();
  }

  private async loadPrinters() {
    try {
      const printers = await firstValueFrom(this.apiService.fetchImpressoras());
      this.printers = printers.map(p => ({ label: p.name, value: p.zplId || p.id }));
    } catch (error) {
      console.error('Erro ao carregar impressoras', error);
    }
  }

  private async loadLayouts() {
    try {
      const layouts = await firstValueFrom(this.apiService.fetchEtiquetas());
      this.layouts = layouts.map(l => ({ label: l.name, value: l.id }));
    } catch (error) {
      console.error('Erro ao carregar layouts', error);
    }
  }

  private restoreSettings() {
    const lastPrinter = localStorage.getItem('last_printer');
    const lastLayout = localStorage.getItem('last_layout');
    if (lastPrinter) this.selectedPrinter = lastPrinter;
    if (lastLayout) this.selectedLayout = lastLayout;
  }

  private saveSettings() {
    localStorage.setItem('last_printer', this.selectedPrinter);
    localStorage.setItem('last_layout', this.selectedLayout);
  }

  openKeyboard(target: 'OP' | 'NF' | 'QUANT' | 'OPERATOR' | 'PASSWORD') {
    this.keyboardTarget = target;
    if (target === 'OP') this.keyboardValue = this.opSearch;
    if (target === 'NF') this.keyboardValue = this.opData?.nf || '';
    if (target === 'QUANT') this.keyboardValue = this.quantidade.toString();
    if (target === 'OPERATOR') this.keyboardValue = this.operatorCode;
    
    if (target === 'PASSWORD') {
      this.showPasswordKeyboard = true;
    } else {
      this.showKeyboard = true;
    }
    this.cdr.detectChanges();
  }

  onKeyboardConfirm() {
    const target = this.keyboardTarget;
    const value = this.keyboardValue;
    
    this.showKeyboard = false;

    // Usamos Promise.resolve para garantir que o teclado feche totalmente antes da próxima ação
    Promise.resolve().then(() => {
      if (target === 'OP') {
        this.opSearch = value;
        this.validateOP();
      } else if (target === 'NF') {
        this.tempNF = value;
        this.updateNF();
      } else if (target === 'QUANT') {
        this.quantidade = parseInt(value) || 1;
      } else if (target === 'OPERATOR') {
        this.operatorCode = value;
      }
      this.cdr.detectChanges();
    });
  }

  onPasswordKeyboardConfirm() {
    this.showPasswordKeyboard = false;
    this.cdr.detectChanges();
  }

  onKeyboardValueChange(val: string) {
    this.keyboardValue = val;
  }

  async validateOP() {
    if (!this.opSearch || this.isLoading) return;

    if (!this.isLoggedIn) {
      this.pendingAction = () => this.validateOP();
      setTimeout(() => this.loginModal.open());
      return;
    }

    this.isLoading = true;
    this.cdr.detectChanges();

    try {
      const op = this.opSearch;
      const operator = this.operatorCode;

      // Timeout de 15 segundos para não travar a tela
      const result = await firstValueFrom(
        this.apiService.fetchOPData(op, operator).pipe(timeout(15000))
      ) as ApontamentoApiResponse<OPApiData>;
      
      if (result.success && result.data) {
        this.opData = result.data as OPApiData;
        this.notification.success('OP validada com sucesso!');
      } else {
        this.opData = null;
        this.notification.error(result.error || 'OP não encontrada.');
      }
    } catch (error: unknown) {
      console.error('Erro na validação:', error);
      this.opData = null;
      
      const isTimeout = error instanceof Error && error.name === 'TimeoutError';
      const msg = isTimeout ? 'Tempo esgotado (Timeout).' : 'Erro de conexão com o servidor.';
      
      this.notification.error(msg);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  clearSearch() {
    this.opSearch = '';
    this.opData = null;
    this.isLoading = false;
    this.cdr.detectChanges();
  }

  async updateNF() {
    if (!this.opData || this.isLoading) return;

    if (!this.isLoggedIn) {
      this.pendingAction = () => this.updateNF();
      setTimeout(() => this.loginModal.open());
      return;
    }
    
    this.isLoading = true;
    this.cdr.detectChanges();

    try {
      const data = this.apontamentoService.data();
      const payload = {
        op: this.opData.op,
        nf: this.tempNF,
        codOper: data.operatorCode,
        nomeOp: data.operatorName || '',
        qtd: this.quantidade || 0,
        filial: data.operatorFilial || '01'
      };

      const result = await firstValueFrom(this.apiService.updateNF(payload)) as ApontamentoApiResponse;
      
      if (result.success) {
        this.notification.success('Nota Fiscal atualizada com sucesso!');
        if (this.opData) this.opData.nf = this.tempNF;
      } else {
        this.notification.error(result.error || 'Falha ao atualizar NF.');
      }
    } catch (error) {
      console.error('Erro ao atualizar NF:', error);
      this.notification.error('Erro de conexão ao atualizar NF.');
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  async printLabel() {
    if (!this.opData) {
      this.notification.warning('Valide uma OP primeiro.');
      return;
    }

    if (!this.isLoggedIn) {
      this.pendingAction = () => this.printLabel();
      setTimeout(() => this.loginModal.open());
      return;
    }

    if (!this.selectedPrinter || !this.selectedLayout) {
      this.notification.warning('Selecione impressora e layout.');
      return;
    }

    this.isLoading = true;
    this.saveSettings();

    const payload: ImpressaoPayload = {
      Op: this.opData.op,
      IdZpl: this.selectedPrinter,
      Quant: this.quantidade,
      Layout: this.selectedLayout
    };

    try {
      const result = await firstValueFrom(this.apiService.imprimirEtiqueta(payload)) as ApontamentoApiResponse;
      if (result.success) {
        this.notification.success('Impressão enviada com sucesso!');
      } else {
        this.notification.error(result.error || 'Erro ao imprimir.');
      }
    } catch (error) {
      console.error('Falha na impressão:', error);
      this.notification.error('Falha na requisição de impressão.');
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  async handleLogin() {
    if (!this.operatorCode || !this.operatorPassword) {
      this.notification.warning('Informe código e senha.');
      return;
    }

    this.isValidatingLogin = true;
    this.cdr.detectChanges();

    try {
      const validation = await firstValueFrom(
        this.apiService.validateOperador(this.operatorCode, this.operatorPassword, [])
      );

      if (validation.success) {
        this.isLoggedIn = true;
        this.apontamentoService.updateData({
          operatorCode: this.operatorCode,
          operatorPassword: this.operatorPassword,
          operatorName: validation.data?.nome || '',
          operatorFilial: validation.data?.filial || '01'
        });
        this.loginModal.close();
        this.notification.success(`Olá, ${validation.data?.nome}`);
        
        if (this.pendingAction) {
          const action = this.pendingAction;
          this.pendingAction = null;
          action();
        }
      } else {
        this.notification.error(validation.error || 'Falha na autenticação.');
      }
    } catch (error) {
      console.error('Erro no login:', error);
      this.notification.error('Erro de conexão ao validar login.');
    } finally {
      this.isValidatingLogin = false;
      this.cdr.detectChanges();
    }
  }

  get statusClass() {
    if (!this.opData) return '';
    return this.opData.status.toLowerCase().includes('aberta') ? 'status-open' : 'status-closed';
  }
}
