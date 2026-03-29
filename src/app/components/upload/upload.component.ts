import { Component, ViewChild, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  PoPageModule,
  PoTableModule,
  PoFieldModule,
  PoNotificationService,
  PoDividerModule,
  PoLoadingModule,
  PoButtonModule,
  PoTableComponent,
  PoTableColumn,
  PoStepperComponent,
  PoContainerModule,
  PoStepperModule,
  PoWidgetModule,
  PoInfoModule,
  PoUploadFile
} from '@po-ui/ng-components';
import { ImportacaoService } from '../../services/importacao.service';
import { PedidoCsv, ResultadoImportacao } from '../../models/importacao.model';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PoPageModule,
    PoFieldModule,
    PoTableModule,
    PoDividerModule,
    PoLoadingModule,
    PoButtonModule,
    PoContainerModule,
    PoStepperModule,
    PoWidgetModule,
    PoInfoModule
  ],
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.css']
})
export class UploadComponent {
  @ViewChild('POItemsOri', { static: false }) poItemsOri!: PoTableComponent;
  @ViewChild('stepper', { static: false }) stepper!: PoStepperComponent;

  // Injeções
  private service: ImportacaoService = inject(ImportacaoService);
  private notification: PoNotificationService = inject(PoNotificationService);
  private router: Router = inject(Router);
  private cdr: ChangeDetectorRef = inject(ChangeDetectorRef);

  // Estado da tela
  origem = '';
  arquivoNome = '';
  isLoading = false;

  // Dados
  pedidos: PedidoCsv[] = [];           // Lista completa com $selected para o po-table
  pedidosSelecionados: PedidoCsv[] = []; // Cópia dos selecionados para enviar ao Protheus

  readonly origens = [
    { label: 'CRM', value: 'CRM' },
    { label: 'E-commerce', value: 'Ecommerce' },
    { label: 'Protheus', value: 'Protheus' }
  ];

  readonly columns: PoTableColumn[] = [
    { property: 'C5_EXTERNO', label: 'Ped. Externo', width: '20%' },
    { property: 'C5_CLIENTE', label: 'Cliente', width: '25%' },
    { property: 'C6_PRODUTO', label: 'Produto', width: '25%' },
    { property: 'C6_QTDVEN', label: 'Qtd', type: 'number', width: '10%' },
    { property: 'C6_PRCVEN', label: 'Preço', type: 'currency', format: 'BRL', width: '20%' }
  ];



  // --- Funções de validação para o Stepper ---

  /** Passo 1 → 2: libera somente se tiver origem E arquivo com dados */
  arquivosUpload: PoUploadFile[] = []; // Armazena estado do po-upload para limpar após leitura

  podeAvancarPasso1 = (): boolean => {
    return !!this.origem && this.pedidos.length > 0;
  }

  podeAvancarPasso2 = (): boolean => {
    return this.pedidosSelecionados.length > 0;
  }

  // --- Captura do arquivo via po-upload (Drag & Drop) ---

  onFileChangeUpload(files: PoUploadFile[]): void {
    if (!files || files.length === 0) return;

    // O po-upload nos dá um array de PoUploadFile. O arquivo nativo fica em rawFile.
    const poFile = files[0];
    const nativeFile: File = poFile.rawFile || poFile;

    if (!nativeFile) return;

    const ext = nativeFile.name.split('.').pop()?.toLowerCase();
    if (ext !== 'csv' && ext !== 'xlsx') {
      this.notification.error('Formato inválido! Use apenas .csv ou .xlsx');
      this.arquivosUpload = []; // Limpa seleção inválida
      return;
    }

    this.arquivoNome = nativeFile.name;
    this.isLoading = true;
    this.pedidos = [];
    this.pedidosSelecionados = [];

    // Lê o arquivo localmente — SEM enviar ao Protheus
    this.service.lerArquivo(nativeFile).then((data: PedidoCsv[]) => {
      this.isLoading = false;

      if (!data || data.length === 0) {
        this.notification.warning('Arquivo lido, mas não contém dados válidos.');
        this.arquivosUpload = [];
        return;
      }

      // Marca todos como selecionados ($selected: true) ao carregar
      this.pedidos = data.map((item: PedidoCsv) => ({ ...item, $selected: true }));
      this.pedidosSelecionados = [...this.pedidos];

      this.notification.success(`${data.length} pedidos carregados — todos pré-selecionados.`);
      this.cdr.detectChanges();

      // Avança automaticamente para o Passo 2 (Conferência) se a origem já foi preenchida
      if (this.origem && this.stepper) {
        setTimeout(() => this.stepper.next(), 400);
      }

    }).catch((err: unknown) => {
      this.isLoading = false;
      this.notification.error('Erro na leitura do arquivo: ' + (err as Error).message);
    });

    // Limpa a seleção para permitir re-selecionar o mesmo arquivo se as alterações forem feitas
    this.arquivosUpload = [];
  }

  // --- Controle da seleção na po-table (Passo 2) ---

  avancarParaImportar(): void {
    if (this.pedidosSelecionados.length === 0) {
      this.notification.warning('Selecione ao menos um item para continuar.');
      return;
    }
    if (this.stepper) {
      this.stepper.next();
    }
  }

  onItemSelecionado(item: PedidoCsv): void {
    const exists = this.pedidosSelecionados.some(
      p => p.C5_EXTERNO === item.C5_EXTERNO && p.C6_PRODUTO === item.C6_PRODUTO
    );
    if (!exists) {
      this.pedidosSelecionados = [...this.pedidosSelecionados, item];
    }
  }

  onItemRemovido(item: PedidoCsv): void {
    this.pedidosSelecionados = this.pedidosSelecionados.filter(
      p => !(p.C5_EXTERNO === item.C5_EXTERNO && p.C6_PRODUTO === item.C6_PRODUTO)
    );
  }

  // --- Ações da toolbar ---

  baixarModelo(): void {
    const linhas: (string | number)[][] = [
      ['C5_EXTERNO', 'C5_CLIENTE', 'C6_PRODUTO', 'C6_QTDVEN', 'C6_PRCVEN'],
      ['P0001', 'PROSPERA CLIENTE 1', 'PROD001', 5, 1500.00],
      ['P0002', 'PROSPERA CLIENTE 2', 'PROD002', 1, 80.50]
    ];
    const ws = XLSX.utils.aoa_to_sheet(linhas);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pedidos');
    XLSX.writeFile(wb, 'modelo_importacao_pedidos.xlsx');
  }

  limpar(): void {
    this.origem = '';
    this.arquivoNome = '';
    this.pedidos = [];
    this.pedidosSelecionados = [];
    this.arquivosUpload = [];
    if (this.stepper) {
      this.stepper.active(0);
    }
    this.cdr.detectChanges();
  }

  // --- Envio ao Protheus (Passo 3) ---

  importar(): void {
    if (this.pedidosSelecionados.length === 0) {
      this.notification.warning('Nenhum item selecionado para importar.');
      return;
    }

    this.isLoading = true;

    // Envia apenas os campos do modelo (sem $selected)
    const payload: PedidoCsv[] = this.pedidosSelecionados.map(({ C5_EXTERNO, C5_CLIENTE, C6_PRODUTO, C6_QTDVEN, C6_PRCVEN }) => ({
      C5_EXTERNO, C5_CLIENTE, C6_PRODUTO, C6_QTDVEN, C6_PRCVEN
    }));

    this.service.importar(payload, this.origem).subscribe({
      next: (res: ResultadoImportacao) => {
        this.isLoading = false;
        this.router.navigate(['/resultado'], { state: { resultado: res } });
      },
      error: () => {
        this.isLoading = false;
        this.notification.error('Falha ao conectar com o servidor Protheus.');
      }
    });
  }
}
