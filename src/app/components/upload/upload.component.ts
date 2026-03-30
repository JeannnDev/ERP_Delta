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
  PoStepperComponent,
  PoContainerModule,
  PoStepperModule,
  PoWidgetModule,
  PoInfoModule,
  PoUploadFile,
  PoTableColumn,
  PoTagType
} from '@po-ui/ng-components';
import { ImportacaoService } from '../../services/importacao.service';
import { PedidoCsv, PedidoAgrupado, ResultadoImportacao, RawRecord } from '../../models/importacao.model';
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

  // Tipos para as Tags (Ajustados para evitar 'any' e respeitar o PoTagType)
  tagSuccess: PoTagType = PoTagType.Success;
  tagDanger: PoTagType = PoTagType.Danger;
  tagInfo: PoTagType = PoTagType.Info;
  tagWarning: PoTagType = PoTagType.Warning;

  // Dados
  pedidos: PedidoAgrupado[] = [];           // Lista final processada (Agrupada)
  pedidosSelecionados: PedidoAgrupado[] = []; // Selecionados para envio

  // Suporte a dois arquivos
  dadosCabecalho: RawRecord[] = []; // Infelizmente esses dados vêm do parser de CSV de forma genérica
  dadosItens: RawRecord[] = [];
  nomeArquivoCabecalho = '';
  nomeArquivoItens = '';
  arquivosCabecalho: PoUploadFile[] = [];
  arquivosItens: PoUploadFile[] = [];

  readonly origens = [
    { label: 'CRM', value: 'CRM' },
    { label: 'E-commerce', value: 'Ecommerce' },
    { label: 'Protheus', value: 'Protheus' }
  ];

  // Configurações das colunas da tabela
  readonly masterColumns: PoTableColumn[] = MASTER_COLUMNS;



  // --- Funções de validação para o Stepper ---

  /** Passo 1 → 2: libera somente se tiver origem E arquivo com dados */
  arquivosUpload: PoUploadFile[] = []; // Armazena estado do po-upload para limpar após leitura

  podeAvancarPasso1 = (): boolean => {
    // Se estiver em modo de arquivo único ou duplo, precisa ter pedidos processados
    return !!this.origem && this.pedidos.length > 0;
  }

  podeAvancarPasso2 = (): boolean => {
    return this.pedidosSelecionados.length > 0;
  }

  // --- Captura do arquivo via po-upload (Drag & Drop) ---

  /** Lógica para arquivo único (legada) */
  onFileChangeUpload(files: PoUploadFile[]): void {
    if (!files || files.length === 0) return;
    const poFile = files[0];
    const nativeFile: File = poFile.rawFile || poFile;
    if (!nativeFile) return;

    this.arquivoNome = nativeFile.name;
    this.isLoading = true;
    this.pedidos = [];
    this.pedidosSelecionados = [];

    this.service.lerArquivo(nativeFile).then((data: PedidoCsv[]) => {
      this.isLoading = false;
      
      // Mapeia os dados brutos para o formato PedidoAgrupado
      const map = new Map<string, PedidoCsv[]>();
      data.forEach(item => {
        const id = item.C5_EXTERNO || '';
        if (!map.has(id)) map.set(id, []);
        map.get(id)?.push(item);
      });

      this.pedidos = Array.from(map.entries()).map(([key, items]) => {
        const h = items[0];
        const invalid = items.some(i => i.invalid) || !h.C5_CLIENTE;
        return {
          C5_EXTERNO: key,
          C5_CLIENTE: h.C5_CLIENTE || '',
          C5_EMISSAO: h.C5_EMISSAO || '',
          C5_FILIAL: h.C5_FILIAL || '',
          C5_LOJA: h.C5_LOJA || '',
          C5_OBS: h.C5_OBS || '',
          C5_CONDPAG: h.C5_CONDPAG || '',
          C5_TABELA: h.C5_TABELA || '',
          C5_VENDEDO: h.C5_VENDEDO || '',
          detalhe: items,
          qtdItens: items.length,
          valorTotal: items.reduce((acc, curr) => acc + ((curr.C6_QTDVEN || 0) * (curr.C6_PRCVEN || 0)), 0),
          invalid: invalid,
          statusLabel: invalid ? 'true' : 'false',
          $selected: !invalid && items.length > 0
        } as PedidoAgrupado;
      });

      // Garantir que os itens no detalhe também tenham statusLabel amigável
      this.pedidos.forEach(p => {
        p.detalhe.forEach(it => {
          it.statusLabel = it.invalid ? 'Erro' : 'OK';
        });
      });

      this.pedidosSelecionados = this.pedidos.filter(p => p.$selected);
      this.notification.success(`${data.length} itens carregados e agrupados em ${this.pedidos.length} pedidos.`);
      if (this.origem && this.stepper) setTimeout(() => this.stepper.next(), 400);
    }).catch((err) => {
      this.isLoading = false;
      this.notification.error('Erro: ' + err.message);
    });
    this.arquivosUpload = [];
  }

  /** Lógica para Cabeçalhos (Arquivo 1) */
  onCabecalhoChange(files: PoUploadFile[]): void {
    if (!files || files.length === 0) return;
    const nativeFile: File = files[0].rawFile;
    
    if (!nativeFile) return;

    this.nomeArquivoCabecalho = nativeFile.name;
    
    // Pequeno delay para garantir que o Angular processe a adição do arquivo antes do loading
    setTimeout(() => {
      this.isLoading = true;
      this.service.lerGenerico(nativeFile).then(data => {
        this.dadosCabecalho = data;
        this.isLoading = false;
        this.notification.information('Cabeçalhos carregados. Agora carregue os Itens.');
        this.processarArquivos();
      }).catch(err => {
        this.isLoading = false;
        this.notification.error('Erro no cabeçalho: ' + err.message);
      });
    });
  }

  /** Lógica para Itens (Arquivo 2) */
  onItensChange(files: PoUploadFile[]): void {
    if (!files || files.length === 0) return;
    const nativeFile: File = files[0].rawFile;
    
    if (!nativeFile) return;

    this.nomeArquivoItens = nativeFile.name;
    
    setTimeout(() => {
      this.isLoading = true;
      this.service.lerGenerico(nativeFile).then(data => {
        this.dadosItens = data;
        this.isLoading = false;
        this.processarArquivos();
      }).catch(err => {
        this.isLoading = false;
        this.notification.error('Erro nos itens: ' + err.message);
      });
    });
  }

  /** Merge dos dois arquivos - Agora com visão Agrupada Mestre/Detalhe */
  private processarArquivos(): void {
    if (!this.dadosCabecalho.length || !this.dadosItens.length) {
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    const mapItens = new Map<string, RawRecord[]>();
    this.dadosItens.forEach(it => {
      const id = (it.PedidoExterno || it.C5_EXTERNO || '').toString().trim();
      if (id) {
        if (!mapItens.has(id)) mapItens.set(id, []);
        mapItens.get(id)?.push(it);
      }
    });

    const agrupados: PedidoAgrupado[] = [];
    const headersUsados = new Set<string>();

    this.dadosCabecalho.forEach(h => {
      const idStr = (h.PedidoExterno || h.C5_EXTERNO || '').toString().trim();
      if (!idStr) return;

      const itensRaw = mapItens.get(idStr) || [];
      headersUsados.add(idStr);

      const items: PedidoCsv[] = itensRaw.map((it: RawRecord) => {
        const isQtyZero = Number(it.Quantidade || it.C6_QTDVEN || 0) <= 0;
        const noProd = !(it.Produto || it.C6_PRODUTO || '').toString().trim();
        const invalid = isQtyZero || noProd;
        
        return {
          C5_EXTERNO: idStr,
          C5_FILIAL: (h.Filial || '').toString().trim(),
          C5_EMISSAO: this.formatarDataExcel(h.Emissao),
          C5_CLIENTE: (h.Cliente || '').toString().trim(),
          C6_ITEM: (it.Item || '').toString().trim(),
          C6_PRODUTO: (it.Produto || it.C6_PRODUTO || '').toString().trim(),
          C6_QTDVEN: Number(it.Quantidade || it.C6_QTDVEN || 0),
          C6_PRCVEN: Number(it.PrecoUnit || it.C6_PRCVEN || 0),
          C6_DESCONTO: Number(it.DescontoPerc || it.C6_DESCONTO || 0),
          invalid: invalid,
          statusLabel: invalid ? 'Erro' : 'OK',
          $selected: true
        } as PedidoCsv;
      });

      const pedidoAgrupado: PedidoAgrupado = {
        C5_EXTERNO: idStr,
        C5_CLIENTE: (h.Cliente || '').toString().trim(),
        C5_EMISSAO: this.formatarDataExcel(h.Emissao),
        C5_FILIAL: (h.Filial || '').toString().trim(),
        C5_CONDPAG: (h.CondPag || '').toString().trim(),
        C5_TABELA: (h.TabelaPreco || '').toString().trim(),
        C5_VENDEDO: (h.Vendedor || '').toString().trim(),
        C5_LOJA: (h.Loja || '').toString().trim(),
        C5_OBS: (h.Obs || '').toString().trim(),
        detalhe: items, 
        qtdItens: items.length,
        valorTotal: items.reduce((acc, curr) => acc + (curr.C6_QTDVEN * curr.C6_PRCVEN), 0),
        invalid: items.length === 0 || items.some(i => i.invalid) || !h.Cliente,
        statusLabel: (items.length === 0 || items.some(i => i.invalid) || !h.Cliente) ? 'true' : 'false',
        $selected: items.length > 0 && !items.some(i => i.invalid) && !!h.Cliente
      };

      agrupados.push(pedidoAgrupado);
    });

    // Itens órfãos (sem cabeçalho)
    this.dadosItens.forEach(it => {
      const idStr = (it.PedidoExterno || it.C5_EXTERNO || '').toString().trim();
      if (idStr && !headersUsados.has(idStr)) {
        agrupados.push({
          C5_EXTERNO: idStr,
          C5_CLIENTE: '!!! CABEÇALHO NÃO ENCONTRADO !!!',
          detalhe: [{
            C5_EXTERNO: idStr,
            C5_CLIENTE: 'ERR',
            C6_PRODUTO: (it.Produto || it.C6_PRODUTO || '').toString().trim(),
            C6_QTDVEN: Number(it.Quantidade || it.C6_QTDVEN || 0),
            C6_PRCVEN: Number(it.PrecoUnit || it.C6_PRCVEN || 0),
            C6_ITEM: (it.Item || '').toString().trim(),
            invalid: true,
            statusLabel: 'Erro',
            $selected: false
          }],
          qtdItens: 1,
          valorTotal: Number(it.Quantidade || 0) * Number(it.PrecoUnit || 0),
          invalid: true,
          statusLabel: 'true',
          $selected: false
        } as PedidoAgrupado);
      }
    });

    this.pedidos = agrupados; // Agora é uma lista de Pedidos Master
    this.pedidosSelecionados = this.pedidos.filter(p => p.$selected);
    this.isLoading = false;

    const countErros = this.pedidos.filter(p => p.invalid).length;
    if (countErros > 0) {
      this.notification.warning(`Foram encontrados ${countErros} cabeçalhos com problemas.`);
    } else {
      this.notification.success(`Sucesso! ${this.pedidos.length} pedidos vinculados.`);
    }

    if (this.origem && this.stepper) {
      setTimeout(() => this.stepper.next(), 800);
    }
    this.cdr.detectChanges();
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

  onItemSelecionado(item: PedidoAgrupado): void {
    const exists = this.pedidosSelecionados.some(p => p.C5_EXTERNO === item.C5_EXTERNO);
    if (!exists) {
      this.pedidosSelecionados = [...this.pedidosSelecionados, item];
    }
  }

  onItemRemovido(item: PedidoAgrupado): void {
    this.pedidosSelecionados = this.pedidosSelecionados.filter(
      p => p.C5_EXTERNO !== item.C5_EXTERNO
    );
  }

  // --- Ações da toolbar ---

  baixarModeloCabecalho(): void {
    // Modelo Cabeçalho
    const cabLinhas: (string | number)[][] = [
      ['Filial', 'Emissao', 'Cliente', 'Loja', 'CondPag', 'TabelaPreco', 'Vendedor', 'Obs', 'PedidoExterno'],
      ['01', '20240320', '000001', '01', '001', '001', '000001', 'Teste Importação', 'P0001']
    ];
    const wsCab = XLSX.utils.aoa_to_sheet(cabLinhas);
    const wbCab = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wbCab, wsCab, 'Cabecalho');
    XLSX.writeFile(wbCab, 'modelo_cabecalho.xlsx');
  }

  baixarModeloItens(): void {
    // Modelo Itens
    const itemLinhas: (string | number)[][] = [
      ['PedidoExterno', 'Item', 'Produto', 'Quantidade', 'PrecoUnit', 'DescontoPerc'],
      ['P0001', '01', 'PROD001', 10, 150.50, 5]
    ];
    const wsIt = XLSX.utils.aoa_to_sheet(itemLinhas);
    const wbIt = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wbIt, wsIt, 'Itens');
    XLSX.writeFile(wbIt, 'modelo_itens.xlsx');
  }

  limpar(): void {
    this.origem = '';
    this.arquivoNome = '';
    this.nomeArquivoCabecalho = '';
    this.nomeArquivoItens = '';
    this.pedidos = [];
    this.pedidosSelecionados = [];
    this.arquivosUpload = [];
    this.arquivosCabecalho = [];
    this.arquivosItens = [];
    this.dadosCabecalho = [];
    this.dadosItens = [];

    if (this.stepper) {
      this.stepper.active(0);
    }
    this.cdr.detectChanges();
  }

  // --- Envio ao Protheus (Passo 3) ---

  importar(): void {
    if (this.pedidosSelecionados.length === 0) {
      this.notification.warning('Nenhum item válido selecionado para importar.');
      return;
    }

    const hasInvalidSelected = this.pedidosSelecionados.some(p => p.invalid);
    if (hasInvalidSelected) {
      this.notification.error('Existem linhas inválidas selecionadas. Desmarque-as para continuar.');
      return;
    }

    this.isLoading = true;

    // Mapeia todos os itens de todos os pedidos selecionados para o payload flat
    const payload: PedidoCsv[] = [];
    
    this.pedidosSelecionados.forEach(order => {
      if (order.detalhe && Array.isArray(order.detalhe)) {
        order.detalhe.forEach((item: PedidoCsv) => {
          // Cópia para não alterar o item da tela
          const itemPayload: PedidoCsv = { ...item };
          // Remove propriedades de controle que não devem ir pro Protheus
          delete itemPayload.$selected;
          delete itemPayload.statusLabel;
          delete itemPayload.invalid;
          payload.push(itemPayload);
        });
      }
    });

    if (payload.length === 0) {
      this.notification.warning('Não há itens válidos para enviar.');
      this.isLoading = false;
      return;
    }

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

  /** Formata data vindo do Excel (serial ou string ISO) */
  private formatarDataExcel(dataRaw: string | number | null | undefined): string {
    if (!dataRaw) return '';
    
    // Converte para número se for uma string numérica
    const num = Number(dataRaw);
    
    // Se for um número válido (serial Excel)
    if (!isNaN(num) && num > 10000) {
      const date = new Date(Math.round((num - 25569) * 86400 * 1000));
      return date.toISOString().split('T')[0];
    }
    
    // Se for string YYYYMMDD (comum em Protheus)
    const str = dataRaw.toString().trim();
    if (str.length === 8 && !isNaN(Number(str))) {
      return `${str.substring(0, 4)}-${str.substring(4, 6)}-${str.substring(6, 8)}`;
    }
    
    return str;
  }

  get pedidosValidosCount(): number {
    return this.pedidos.filter(p => !p.invalid).length;
  }

  get pedidosInvalidosCount(): number {
    return this.pedidos.filter(p => p.invalid).length;
  }
}

/** Definição estática das colunas para manter o componente organizado */
const MASTER_COLUMNS: PoTableColumn[] = [
  { property: 'statusLabel', label: 'Status', type: 'label', width: '110px', labels: [
    { value: 'false', color: 'color-11', label: 'Válido', icon: 'po-icon-ok' },
    { value: 'true', color: 'color-07', label: 'Inválido', icon: 'po-icon-danger' }
  ]},
  { property: 'detalhe', type: 'detail', detail: {
    columns: [
      { property: 'C6_ITEM', label: 'Item' },
      { property: 'C6_PRODUTO', label: 'Produto' },
      { property: 'C6_QTDVEN', label: 'Quantidade', type: 'number' },
      { property: 'C6_PRCVEN', label: 'Preço Unit.', type: 'currency', format: 'BRL' },
      { property: 'C6_DESCONTO', label: 'Desc. %', type: 'number' },
      { property: 'statusLabel', label: 'Status' }
    ],
    typeHeader: 'inline'
  } },
  { property: 'C5_EXTERNO', label: 'Pedido Externo', width: '160px' },
  { property: 'C5_CLIENTE', label: 'ID Cliente', width: '120px' },
  { property: 'C5_EMISSAO', label: 'Dt. Emissão', width: '120px', type: 'date', format: 'dd/MM/yyyy' },
  { property: 'valorTotal', label: 'Valor Total', type: 'currency', format: 'BRL', width: '140px' },
  { property: 'qtdItens', label: 'Qtd Itens', width: '90px' },
  { property: 'C5_OBS', label: 'Observações' }
];
