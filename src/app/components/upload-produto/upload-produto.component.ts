import { Component, ViewChild, ChangeDetectorRef, inject } from '@angular/core';

import { FormsModule } from '@angular/forms';
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
  PoUploadFile,
} from '@po-ui/ng-components';
import * as XLSX from 'xlsx';

export interface ProdutoCsv {
  B1_COD: string;
  B1_DESC: string;
  B1_UM?: string;
  B1_GRUPO?: string;
  B1_LOCPAD?: string;
  $selected?: boolean;
}

@Component({
  selector: 'app-upload-produto',
  standalone: true,
  imports: [
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
    PoInfoModule,
  ],
  templateUrl: './upload-produto.component.html',
  styleUrls: ['./upload-produto.component.css'],
})
export class UploadProdutoComponent {
  @ViewChild('tabelaProdutos', { static: false }) tabelaProdutos!: PoTableComponent;
  @ViewChild('stepper', { static: false }) stepper!: PoStepperComponent;

  private notification: PoNotificationService = inject(PoNotificationService);
  private cdr: ChangeDetectorRef = inject(ChangeDetectorRef);

  arquivoNome = '';
  isLoading = false;
  arquivosUpload: PoUploadFile[] = [];

  produtos: ProdutoCsv[] = [];
  produtosSelecionados: ProdutoCsv[] = [];

  readonly columns: PoTableColumn[] = [
    { property: 'B1_COD', label: 'Código', width: '20%' },
    { property: 'B1_DESC', label: 'Descrição', width: '35%' },
    { property: 'B1_UM', label: 'Unid. Med.', width: '15%' },
    { property: 'B1_GRUPO', label: 'Grupo', width: '15%' },
    { property: 'B1_LOCPAD', label: 'Local Padrão', width: '15%' },
  ];

  podeAvancarPasso1 = (): boolean => this.produtos.length > 0;
  podeAvancarPasso2 = (): boolean => this.produtosSelecionados.length > 0;

  onFileChangeUpload(files: PoUploadFile[]): void {
    if (!files || files.length === 0) return;

    const poFile = files[0];
    const nativeFile: File =
      (poFile as unknown as { rawFile: File }).rawFile || (poFile as unknown as File);
    if (!nativeFile) return;

    const ext = nativeFile.name.split('.').pop()?.toLowerCase();
    if (ext !== 'csv' && ext !== 'xlsx') {
      this.notification.error('Formato inválido! Use apenas .csv ou .xlsx');
      this.arquivosUpload = [];
      return;
    }

    this.arquivoNome = nativeFile.name;
    this.isLoading = true;
    this.produtos = [];
    this.produtosSelecionados = [];

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        if (rows.length < 2) {
          this.notification.warning('Arquivo vazio ou sem dados.');
          this.isLoading = false;
          this.arquivosUpload = [];
          return;
        }

        const parsed: ProdutoCsv[] = rows
          .slice(1)
          .map((row) => ({
            B1_COD: String(row[0] || '').trim(),
            B1_DESC: String(row[1] || '').trim(),
            B1_UM: String(row[2] || '').trim(),
            B1_GRUPO: String(row[3] || '').trim(),
            B1_LOCPAD: String(row[4] || '').trim(),
            $selected: true,
          }))
          .filter((p) => p.B1_COD && p.B1_DESC);

        this.produtos = parsed;
        this.produtosSelecionados = [...parsed];
        this.isLoading = false;
        this.notification.success(`${parsed.length} produtos carregados — todos pré-selecionados.`);
        this.cdr.detectChanges();

        if (this.stepper) {
          setTimeout(() => this.stepper.next(), 400);
        }
      } catch {
        this.isLoading = false;
        this.notification.error('Erro ao ler o arquivo.');
      }
    };
    reader.readAsArrayBuffer(nativeFile);
    this.arquivosUpload = [];
  }

  onItemSelecionado(item: ProdutoCsv): void {
    const exists = this.produtosSelecionados.some((p) => p.B1_COD === item.B1_COD);
    if (!exists) this.produtosSelecionados = [...this.produtosSelecionados, item];
  }

  onItemRemovido(item: ProdutoCsv): void {
    this.produtosSelecionados = this.produtosSelecionados.filter((p) => p.B1_COD !== item.B1_COD);
  }

  avancarParaImportar(): void {
    if (this.produtosSelecionados.length === 0) {
      this.notification.warning('Selecione ao menos um item para continuar.');
      return;
    }
    if (this.stepper) this.stepper.next();
  }

  baixarModelo(): void {
    const linhas = [
      ['B1_COD', 'B1_DESC', 'B1_UM', 'B1_GRUPO', 'B1_LOCPAD'],
      ['PROD001', 'Produto Exemplo 1', 'UN', '001', '01'],
      ['PROD002', 'Produto Exemplo 2', 'KG', '002', '01'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(linhas);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Produtos');
    XLSX.writeFile(wb, 'modelo_importacao_produtos.xlsx');
  }

  importar(): void {
    this.notification.information('Integração com o Protheus em desenvolvimento.');
  }

  limpar(): void {
    this.arquivoNome = '';
    this.produtos = [];
    this.produtosSelecionados = [];
    this.arquivosUpload = [];
    if (this.stepper) this.stepper.active(0);
    this.cdr.detectChanges();
  }
}
