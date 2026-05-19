import { Component, inject, ChangeDetectorRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PoModule, PoTableColumn, PoNotificationService, PoLoadingModule, PoTableModule, PoModalComponent, PoModalAction } from '@po-ui/ng-components';
import { ApontamentoApiService } from '../../services/apontamento-api.service';
import { NumericKeyboardComponent } from '../apontamento/numeric-keyboard/numeric-keyboard.component';
import {
  OPApiData,
  Operacao,
  HistoricoApontamento,
  SaldoItem,
  ApontamentoApiResponse,
  HistoricoNF
} from '../../models/apontamento.model';
import { firstValueFrom, timeout } from 'rxjs';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Interface para estender o jsPDF com as propriedades do plugin jspdf-autotable
interface jsPDFWithPlugin extends jsPDF {
  lastAutoTable?: {
    finalY: number;
  };
}

// Tipo local: item de material com status convertido para string (exigência do po-table label)
interface SaldoItemDisplay extends Omit<SaldoItem, 'status'> {
  status: string;
}

// Tipo local: operação com dados do operador mesclados para exibição direta na tabela
interface OperacaoDisplay extends Operacao {
  historicoDisplay: HistoricoApontamento[];
  operadorNome: string;
  operadorCod: string;
  hrIni: string;
  hrFim: string;
  tempoApont: string;
}

// Tipo local: Historico NF formatado
interface HistoricoNFDisplay extends HistoricoNF {
  dtEmissFormatada: string;
}

@Component({
  selector: 'app-historico-op',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PoModule,
    PoLoadingModule,
    PoTableModule,
    NumericKeyboardComponent
  ],
  templateUrl: './historico-op.html',
  styleUrls: ['./historico-op.css']
})
export class HistoricoOPComponent {
  private apiService = inject(ApontamentoApiService);
  private notification = inject(PoNotificationService);
  private cdr = inject(ChangeDetectorRef);

  opSearch = '';
  isLoading = false;
  items: SaldoItemDisplay[] = [];
  roteiro: OperacaoDisplay[] = [];
  historicoNF: HistoricoNFDisplay[] = [];
  opData: OPApiData | null = null;

  // Teclado e Modal
  @ViewChild('exportModal') exportModal!: PoModalComponent;
  showKeyboard = false;

  exportCloseAction: PoModalAction = {
    label: 'Fechar',
    action: () => this.exportModal.close()
  };
  keyboardValue = '';

  readonly materiaisColumns: PoTableColumn[] = [
    { property: 'produto', label: 'Produto', width: '140px' },
    { property: 'descricao', label: 'Descrição', width: '200px' },
    { property: 'um', label: 'UM', width: '60px' },
    { property: 'qtOriginal', label: 'Qtd. Orig.', type: 'number', width: '100px' },
    { property: 'qtdeEmp', label: 'Empenhado', type: 'number', width: '100px' },
    { property: 'saldoEstq', label: 'Saldo Estq.', type: 'number', width: '110px' },
    { property: 'armz', label: 'Armz.', width: '80px' },
    { property: 'endereco', label: 'Endereço', width: '130px' },
    {
      property: 'status', label: 'Status', type: 'label', width: '110px',
      labels: [
        { value: 'true', color: 'color-11', label: 'Disponível' },
        { value: 'false', color: 'color-07', label: 'Indisponível' }
      ]
    }
  ];

  readonly operacaoColumns: PoTableColumn[] = [
    { property: 'operac', label: 'Operação', width: '90px' },
    { property: 'descricao', label: 'Descrição', width: '160px' },
    { property: 'recurso', label: 'Recurso', width: '100px' },
    { property: 'quantidadeProduzida', label: 'Qtd. Prod.', type: 'number', width: '100px' },
    { property: 'operadorCod', label: 'Cód. Op.', width: '90px' },
    { property: 'operadorNome', label: 'Operador', width: '180px' },
    { property: 'hrIni', label: 'Hr. Ini', width: '75px' },
    { property: 'hrFim', label: 'Hr. Fim', width: '75px' },
    { property: 'tempoApont', label: 'Tempo', width: '80px' },
    {
      property: 'status', label: 'Status', type: 'label', width: '110px',
      labels: [
        { value: 'Finalizado', color: 'color-08', label: 'Finalizado' },
        { value: 'Enc. Total', color: 'color-08', label: 'Enc. Total' },
        { value: 'Em Aberto', color: 'color-01', label: 'Em Aberto' },
        { value: 'Pendente', color: 'color-07', label: 'Pendente' }
      ]
    }
  ];

  readonly nfColumns: PoTableColumn[] = [
    { property: 'filial', label: 'Filial', width: '80px' },
    { property: 'nf', label: 'Nota Fiscal', width: '110px' },
    { property: 'dtEmissFormatada', label: 'Emissão', width: '100px' },
    { property: 'codOper', label: 'Cód. Op.', width: '90px' },
    { property: 'nomeOp', label: 'Operador', width: '180px' }
  ];

  // Formata data do Protheus (AAAAMMDD -> DD/MM/AAAA)
  formatProtheusDate(dateStr: string): string {
    if (!dateStr || dateStr.length !== 8) return dateStr;
    return `${dateStr.substring(6, 8)}/${dateStr.substring(4, 6)}/${dateStr.substring(0, 4)}`;
  }

  // Converte tempo Protheus (HHH:MM) em texto legível: '10 min' ou '1h 30min'
  formatTempo(tempoStr: string | number): string {
    const str = String(tempoStr ?? '').trim();
    const match = str.match(/^(\d+):(\d{2})$/);
    if (!match) return str;
    const horas = parseInt(match[1], 10);
    const mins = parseInt(match[2], 10);
    if (horas === 0 && mins === 0) return '—';
    if (horas === 0) return `${mins} min`;
    if (mins === 0) return `${horas}h`;
    return `${horas}h ${mins}min`;
  }

  getProgress(): number {
    const solicitada = this.opData?.quantidadeSolicitada ?? 0;
    const produzida = this.opData?.qtdProduzida ?? 0;
    return solicitada > 0 ? (produzida / solicitada) * 100 : 0;
  }

  // Colunas do histórico de apontamentos (usadas no ng-template do HTML)
  readonly historicoColumns: PoTableColumn[] = [
    { property: 'operadorCod', label: 'Cód. Operador', width: '120px' },
    { property: 'operadorNome', label: 'Nome do Operador' },
    { property: 'dtIni', label: 'Início', width: '100px' },
    { property: 'hrIni', label: 'Hora Ini', width: '80px' },
    { property: 'dtFim', label: 'Fim', width: '100px' },
    { property: 'hrFim', label: 'Hora Fim', width: '80px' },
    { property: 'qtdProd', label: 'Qtd. Prod.', type: 'number', width: '100px' },
    { property: 'tempoApont', label: 'Tempo', width: '100px' }
  ];

  getStatusColor(status: string): string {
    const encerrados = ['enc. total', 'encerrado', 'finalizado', 'concluído'];
    return encerrados.includes(status?.toLowerCase()) ? 'color-08' : 'color-02';
  }

  openKeyboard(): void {
    this.keyboardValue = this.opSearch;
    this.showKeyboard = true;
    this.cdr.detectChanges();
  }

  onKeyboardConfirm(value: string): void {
    this.opSearch = value;
    this.showKeyboard = false;
    this.validateOP();
  }

  async validateOP(): Promise<void> {
    if (!this.opSearch || this.isLoading) return;

    this.isLoading = true;
    this.cdr.detectChanges();

    try {
      const result = await firstValueFrom(
        this.apiService.fetchOPData(this.opSearch, '000001').pipe(timeout(15000))
      ) as ApontamentoApiResponse<OPApiData>;

      if (result.success && result.data) {
        const data = result.data;
        this.opData = data;

        // 1. Materiais — converte status boolean para string
        this.items = (data.saldo_item || []).map((item: SaldoItem): SaldoItemDisplay => ({
          ...item,
          status: String(item.status)
        }));

        // 2. Roteiro — achata o historico[0] nas colunas da linha principal
        this.roteiro = (data.operacoes || []).map((op: Operacao): OperacaoDisplay => {
          const h0 = op.historico?.[0];
          return {
            ...op,
            historicoDisplay: op.historico || [],
            operadorCod: h0?.operadorCod ?? '',
            operadorNome: h0?.operadorNome ?? '',
            hrIni: h0?.hrIni ?? '',
            hrFim: h0?.hrFim ?? '',
            tempoApont: this.formatTempo(h0?.tempoApont ?? '')
          };
        });

        // 3. Historico de NFs
        this.historicoNF = (data.historico_nf || []).map((nf: HistoricoNF): HistoricoNFDisplay => ({
          ...nf,
          dtEmissFormatada: this.formatProtheusDate(nf.dtEmiss || '')
        }));

        // Delay para garantir que o Angular renderize as tabelas no DOM antes de tirar o overlay
        setTimeout(() => {
          this.isLoading = false;
          this.notification.success('Histórico completo carregado!');
          this.cdr.detectChanges();
        }, 500);

      } else {
        this.isLoading = false;
        this.resetData();
        this.notification.error(result.error || 'OP não encontrada.');
      }
    } catch (error: unknown) {
      this.isLoading = false;
      this.resetData();
      const isTimeout = error instanceof Error && error.name === 'TimeoutError';
      this.notification.error(isTimeout ? 'Tempo esgotado.' : 'Erro de conexão.');
    }
  }



  private resetData(): void {
    this.items = [];
    this.roteiro = [];
    this.historicoNF = [];
    this.opData = null;
  }

  clearSearch(): void {
    this.opSearch = '';
    this.resetData();
    this.cdr.detectChanges();
  }

  // EXPORTAÇÃO PARA EXCEL
  exportToExcel(): void {
    if (!this.opData) return;

    // 1. Dados da OP
    const opInfo = [
      ['HISTÓRICO DE ORDEM DE PRODUÇÃO'],
      [''],
      ['Ordem de Produção', this.opData.op || ''],
      ['Produto', `${this.opData.produto || ''} - ${this.opData.descProduto || ''}`],
      ['Status', this.opData.status || ''],
      ['Emissão', this.formatProtheusDate(this.opData.dtEmissao || '')],
      ['Previsão Início', this.formatProtheusDate(this.opData.previsaoIni || '')],
      ['Previsão Entrega', this.formatProtheusDate(this.opData.previsaoEntrega || '')],
      ['Data de Entrega', this.formatProtheusDate(this.opData.dtEntrega || '')],
      ['Qtd. Solicitada', this.opData.quantidadeSolicitada ?? 0],
      ['Qtd. Produzida', this.opData.qtdProduzida ?? 0],
      ['Armazém', this.opData.armazem || ''],
      ['Roteiro', this.opData.roteiroUtilizado || ''],
      [''],
      ['ROTEIRO DE OPERAÇÕES'],
      ['Operação', 'Descrição', 'Recurso', 'Qtd. Prod.', 'Cód. Op.', 'Operador', 'Hr. Ini', 'Hr. Fim', 'Tempo', 'Status']
    ];

    // 2. Adicionar roteiro
    this.roteiro.forEach(op => {
      opInfo.push([
        op.operac || '',
        op.descricao || '',
        op.recurso || '',
        op.quantidadeProduzida ?? 0,
        op.operadorCod || '',
        op.operadorNome || '',
        op.hrIni || '',
        op.hrFim || '',
        op.tempoApont || '',
        op.status || ''
      ]);
    });

    opInfo.push(['']);
    opInfo.push(['MATERIAIS EMPENHADOS']);
    opInfo.push(['Produto', 'Descrição', 'UM', 'Qtd. Orig.', 'Empenhado', 'Saldo Estq.', 'Armz.', 'Endereço', 'Status']);

    // 3. Adicionar materiais
    this.items.forEach(item => {
      opInfo.push([
        item.produto || '',
        item.descricao || '',
        item.um || '',
        item.qtOriginal ?? 0,
        item.qtdeEmp ?? 0,
        item.saldoEstq ?? 0,
        item.armz || '',
        item.endereco || '',
        item.status === 'true' ? 'Disponível' : 'Indisponível'
      ]);
    });

    if (this.historicoNF.length > 0) {
      opInfo.push(['']);
      opInfo.push(['HISTÓRICO DE NOTAS FISCAIS']);
      opInfo.push(['Filial', 'OP', 'Seq', 'Nota Fiscal', 'Qtd', 'Emissão', 'Cód. Op.', 'Operador']);

      this.historicoNF.forEach(nf => {
        opInfo.push([
          nf.filial || '',
          nf.op || '',
          nf.seq || '',
          nf.nf || '',
          nf.qtd ?? 0,
          nf.dtEmissFormatada || '',
          nf.codOper || '',
          nf.nomeOp || ''
        ]);
      });
    }

    const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(opInfo);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Histórico OP');

    XLSX.writeFile(wb, `Historico_OP_${this.opData.op}.xlsx`);
    this.notification.success('Excel exportado com sucesso!');
  }

  // EXPORTAÇÃO PARA PDF (Layout Profissional)
  exportToPDF(): void {
    if (!this.opData) return;

    const doc = new jsPDF() as jsPDFWithPlugin;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // 1. HEADER - Barra superior escura
    doc.setFillColor(20, 37, 61); // Azul Marinho Profissional
    doc.rect(0, 0, pageWidth, 40, 'F');

    // Título no Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text('HISTÓRICO DE PRODUÇÃO', 15, 22);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(200, 200, 200);
    doc.text(`Gerado em: ${new Date().toLocaleString()}`, 15, 30);

    // Status em destaque no Header
    doc.setFillColor(255, 255, 255, 0.15);
    doc.roundedRect(pageWidth - 65, 12, 50, 18, 2, 2, 'F');
    doc.setFontSize(8);
    doc.setTextColor(220, 220, 220);
    doc.text('STATUS ATUAL', pageWidth - 60, 19);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(this.opData.status || '', pageWidth - 60, 26);

    // 2. INFO CARDS - Dados principais em blocos
    let currentY = 50;

    // Card Principal (OP e Produto)
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(10, currentY, pageWidth - 20, 25, 2, 2, 'FD');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('ORDEM DE PRODUÇÃO', 15, currentY + 7);
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(14);
    doc.text(this.opData.op || '', 15, currentY + 16);

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('PRODUTO / DESCRIÇÃO', 80, currentY + 7);
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(11);
    const productText = `${this.opData.produto || ''} - ${this.opData.descProduto || ''}`;
    doc.text(doc.splitTextToSize(productText, pageWidth - 100), 80, currentY + 14);

    currentY += 32;

    // Grid de Detalhes (Datas e Quantidades)
    const cardsPerRow = 3;
    const cardWidth = (pageWidth - 30) / cardsPerRow;
    const details = [
      { label: 'EMISSÃO', value: this.formatProtheusDate(this.opData.dtEmissao || '') },
      { label: 'PREV. INÍCIO', value: this.formatProtheusDate(this.opData.previsaoIni || '') },
      { label: 'PREV. ENTREGA', value: this.formatProtheusDate(this.opData.previsaoEntrega || '') },
      { label: 'DATA ENTREGA', value: this.formatProtheusDate(this.opData.dtEntrega || '') },
      { label: 'QTD. SOLICITADA', value: String(this.opData.quantidadeSolicitada ?? 0) },
      { label: 'QTD. PRODUZIDA', value: String(this.opData.qtdProduzida ?? 0) }
    ];

    details.forEach((item, i) => {
      const row = Math.floor(i / cardsPerRow);
      const col = i % cardsPerRow;
      const x = 10 + (col * (cardWidth + 5));
      const y = currentY + (row * 22);
      
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(x, y, cardWidth - 5, 18, 1, 1, 'D');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(item.label, x + 4, y + 6);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text(item.value, x + 4, y + 13);
    });

    currentY += 50; // Espaço para as duas linhas de cards

    // 3. TABELAS
    this.drawSectionTitle(doc, 'Roteiro de Operações', 10, currentY);
    
    const roteiroBody = this.roteiro.map(op => [
      op.operac || '',
      op.descricao || '',
      op.recurso || '',
      op.quantidadeProduzida ?? 0,
      op.operadorNome || '',
      op.hrIni || '',
      op.hrFim || '',
      op.tempoApont || '',
      op.status || ''
    ]);

    autoTable(doc, {
      startY: currentY + 4,
      head: [['Op', 'Descrição', 'Recurso', 'Prod', 'Operador', 'Início', 'Fim', 'Tempo', 'Status']],
      body: roteiroBody,
      theme: 'grid',
      headStyles: { 
        fillColor: [20, 37, 61], 
        textColor: [255, 255, 255], 
        fontSize: 8, 
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle'
      },
      styles: { fontSize: 7, cellPadding: 3, textColor: [51, 65, 85], lineColor: [226, 232, 240] },
      columnStyles: {
        0: { halign: 'center', fontStyle: 'bold' },
        3: { halign: 'center' },
        5: { halign: 'center' },
        6: { halign: 'center' },
        7: { halign: 'center' },
        8: { halign: 'center' }
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 8) {
          const val = String(data.cell.raw).toLowerCase();
          if (val.includes('finalizado') || val.includes('total')) {
            data.cell.styles.textColor = [21, 128, 61]; // Verde
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
    });

    // Materiais
    let finalY = doc.lastAutoTable?.finalY || currentY + 20;
    
    if (finalY > pageHeight - 60) {
      doc.addPage();
      finalY = 20;
    } else {
      finalY += 15;
    }

    this.drawSectionTitle(doc, 'Materiais Empenhados', 10, finalY);

    const materiaisBody = this.items.map(item => [
      item.produto || '',
      item.descricao || '',
      item.um || '',
      item.qtdeEmp ?? 0,
      item.saldoEstq ?? 0,
      item.armz || '',
      item.status === 'true' ? 'Sim' : 'Não'
    ]);

    autoTable(doc, {
      startY: finalY + 4,
      head: [['Produto', 'Descrição', 'UM', 'Empenhado', 'Saldo', 'Armz', 'Disp']],
      body: materiaisBody,
      theme: 'striped',
      headStyles: { 
        fillColor: [71, 85, 105], 
        textColor: [255, 255, 255], 
        fontSize: 8,
        halign: 'center' 
      },
      styles: { fontSize: 7, cellPadding: 3, textColor: [51, 65, 85] },
      columnStyles: {
        2: { halign: 'center' },
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'center' },
        6: { halign: 'center' }
      }
    });

    // 4. Histórico de NFs
    if (this.historicoNF.length > 0) {
      finalY = doc.lastAutoTable?.finalY || finalY + 20;
      
      if (finalY > pageHeight - 60) {
        doc.addPage();
        finalY = 20;
      } else {
        finalY += 15;
      }

      this.drawSectionTitle(doc, 'Histórico de Notas Fiscais', 10, finalY);

      const nfBody = this.historicoNF.map(nf => [
        nf.filial || '',
        nf.nf || '',
        nf.dtEmissFormatada || '',
        nf.codOper || '',
        nf.nomeOp || ''
      ]);

      autoTable(doc, {
        startY: finalY + 4,
        head: [['Filial', 'Nota Fiscal', 'Emissão', 'Cód. Op.', 'Operador']],
        body: nfBody,
        theme: 'striped',
        headStyles: { 
          fillColor: [71, 85, 105], 
          textColor: [255, 255, 255], 
          fontSize: 8,
          halign: 'center' 
        },
        styles: { fontSize: 7, cellPadding: 3, textColor: [51, 65, 85] },
        columnStyles: {
          2: { halign: 'center' },
          3: { halign: 'center' }
        }
      });
    }

    // 5. FOOTER - Rodapé em todas as páginas
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      
      // Linha superior do rodapé
      doc.setDrawColor(226, 232, 240);
      doc.line(10, pageHeight - 15, pageWidth - 10, pageHeight - 15);
      
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text('ERP DELTA - Sistema de Controle de Produção', 10, pageHeight - 10);
      doc.text(`Página ${i} de ${totalPages}`, pageWidth - 10, pageHeight - 10, { align: 'right' });
    }

    doc.save(`Historico_OP_${this.opData.op}.pdf`);
    this.notification.success('PDF Profissional exportado com sucesso!');
  }

  // Helper: renderiza título de seção compacto
  private drawSectionTitle(doc: jsPDFWithPlugin, title: string, x: number, y: number): void {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(20, 37, 61);
    doc.text(title.toUpperCase(), x, y + 1);

    // Reset
    doc.setFont('helvetica', 'normal');
  }
}
