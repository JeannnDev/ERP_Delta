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

export interface ClienteCsv {
  A1_COD?: string;
  A1_NOME: string;
  A1_CGC: string;
  A1_END?: string;
  A1_BAIRRO?: string;
  A1_EST?: string;
  A1_CEP?: string;
  A1_TEL?: string;
  A1_EMAIL?: string;
  $selected?: boolean;
}

@Component({
  selector: 'app-upload-cliente',
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
  templateUrl: './upload-cliente.component.html',
  styleUrls: ['./upload-cliente.component.css'],
})
export class UploadClienteComponent {
  @ViewChild('tabelaClientes', { static: false }) tabelaClientes!: PoTableComponent;
  @ViewChild('stepper', { static: false }) stepper!: PoStepperComponent;

  private notification: PoNotificationService = inject(PoNotificationService);
  private cdr: ChangeDetectorRef = inject(ChangeDetectorRef);

  arquivoNome = '';
  isLoading = false;
  arquivosUpload: PoUploadFile[] = [];

  clientes: ClienteCsv[] = [];
  clientesSelecionados: ClienteCsv[] = [];

  readonly columns: PoTableColumn[] = [
    { property: 'A1_CGC', label: 'CNPJ/CPF', width: '20%' },
    { property: 'A1_NOME', label: 'Nome', width: '30%' },
    { property: 'A1_EMAIL', label: 'E-mail', width: '25%' },
    { property: 'A1_EST', label: 'UF', width: '10%' },
    { property: 'A1_TEL', label: 'Telefone', width: '15%' },
  ];

  podeAvancarPasso1 = (): boolean => this.clientes.length > 0;
  podeAvancarPasso2 = (): boolean => this.clientesSelecionados.length > 0;

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
    this.clientes = [];
    this.clientesSelecionados = [];

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

        const parsed: ClienteCsv[] = rows
          .slice(1)
          .map((row) => ({
            A1_CGC: String(row[0] || '').trim(),
            A1_NOME: String(row[1] || '').trim(),
            A1_END: String(row[2] || '').trim(),
            A1_BAIRRO: String(row[3] || '').trim(),
            A1_EST: String(row[4] || '').trim(),
            A1_CEP: String(row[5] || '').trim(),
            A1_TEL: String(row[6] || '').trim(),
            A1_EMAIL: String(row[7] || '').trim(),
            $selected: true,
          }))
          .filter((c) => c.A1_CGC && c.A1_NOME);

        this.clientes = parsed;
        this.clientesSelecionados = [...parsed];
        this.isLoading = false;
        this.notification.success(`${parsed.length} clientes carregados — todos pré-selecionados.`);
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

  onItemSelecionado(item: ClienteCsv): void {
    const exists = this.clientesSelecionados.some((c) => c.A1_CGC === item.A1_CGC);
    if (!exists) this.clientesSelecionados = [...this.clientesSelecionados, item];
  }

  onItemRemovido(item: ClienteCsv): void {
    this.clientesSelecionados = this.clientesSelecionados.filter((c) => c.A1_CGC !== item.A1_CGC);
  }

  avancarParaImportar(): void {
    if (this.clientesSelecionados.length === 0) {
      this.notification.warning('Selecione ao menos um item para continuar.');
      return;
    }
    if (this.stepper) this.stepper.next();
  }

  baixarModelo(): void {
    const linhas = [
      ['A1_CGC', 'A1_NOME', 'A1_END', 'A1_BAIRRO', 'A1_EST', 'A1_CEP', 'A1_TEL', 'A1_EMAIL'],
      [
        '12345678000195',
        'Cliente Exemplo LTDA',
        'Rua das Flores, 100',
        'Centro',
        'SP',
        '01000-000',
        '1133334444',
        'cliente@email.com',
      ],
    ];
    const ws = XLSX.utils.aoa_to_sheet(linhas);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
    XLSX.writeFile(wb, 'modelo_importacao_clientes.xlsx');
  }

  importar(): void {
    this.notification.information('Integração com o Protheus em desenvolvimento.');
  }

  limpar(): void {
    this.arquivoNome = '';
    this.clientes = [];
    this.clientesSelecionados = [];
    this.arquivosUpload = [];
    if (this.stepper) this.stepper.active(0);
    this.cdr.detectChanges();
  }
}
