import { Component, OnInit, inject, ViewChild, ChangeDetectorRef } from '@angular/core';
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
import { NumericKeyboardComponent } from '../apontamento/numeric-keyboard/numeric-keyboard.component';
import { OPApiData, ImpressaoPayload, ApontamentoApiResponse } from '../../models/apontamento.model';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-etiqueta',
  standalone: true,
  imports: [CommonModule, FormsModule, PoModule, PoLoadingModule, NumericKeyboardComponent],
  templateUrl: './etiqueta.html',
  styleUrls: ['./etiqueta.css'],
})
export class EtiquetaComponent implements OnInit {
  private apiService = inject(ApontamentoApiService);
  private notification = inject(PoNotificationService);
  private cdr = inject(ChangeDetectorRef);

  @ViewChild('nfModal', { static: true }) nfModal!: PoModalComponent;

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
  keyboardValue = '';
  keyboardTarget: 'OP' | 'NF' | 'QUANT' = 'OP';

  confirmNFAction: PoModalAction = {
    action: () => this.updateNF(),
    label: 'Confirmar Alteração',
  };

  closeNFAction: PoModalAction = {
    action: () => this.nfModal.close(),
    label: 'Cancelar',
  };

  ngOnInit(): void {
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

  openKeyboard(target: 'OP' | 'NF' | 'QUANT') {
    this.keyboardTarget = target;
    if (target === 'OP') this.keyboardValue = this.opSearch;
    if (target === 'NF') this.keyboardValue = this.opData?.nf || '';
    if (target === 'QUANT') this.keyboardValue = this.quantidade.toString();
    this.showKeyboard = true;
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
      }
      this.cdr.detectChanges();
    });
  }

  onKeyboardValueChange(val: string) {
    this.keyboardValue = val;
  }

  async validateOP() {
    if (!this.opSearch || this.isLoading) return;

    this.isLoading = true;
    this.cdr.detectChanges();

    try {
      const result = await firstValueFrom(this.apiService.fetchOPData(this.opSearch, '000001')) as ApontamentoApiResponse<OPApiData>;
      
      if (result.success && result.data) {
        this.opData = result.data as OPApiData;
        this.notification.success('OP validada com sucesso!');
      } else {
        this.opData = null;
        this.notification.error(result.error || 'OP não encontrada.');
      }
    } catch (error) {
      console.error('Erro na validação:', error);
      this.opData = null;
      this.notification.error('Erro de conexão com o servidor.');
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  async updateNF() {
    if (!this.opData || this.isLoading) return;
    
    this.isLoading = true;
    this.cdr.detectChanges();

    try {
      const result = await firstValueFrom(this.apiService.updateNF(this.opData.op, this.tempNF)) as ApontamentoApiResponse;
      
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

  get statusClass() {
    if (!this.opData) return '';
    return this.opData.status.toLowerCase().includes('aberta') ? 'status-open' : 'status-closed';
  }
}
