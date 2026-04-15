import { Component, inject } from '@angular/core';

import { FormsModule } from '@angular/forms';
import {
  PoPageModule,
  PoDynamicModule,
  PoDynamicFormField,
  PoNotificationService,
  PoBreadcrumb,
  PoTableModule,
  PoTableColumn,
  PoButtonModule,
  PoDividerModule,
} from '@po-ui/ng-components';

export interface PedidoHeader {
  C5_CLIENTE: string;
  C5_LOJA: string;
  C5_XORIG: string;
  C5_EMISSAO: string;
}

export interface PedidoItem {
  C6_PRODUTO: string;
  C6_QTDVEN: number;
  C6_PRCVEN: number;
  total?: number;
}

@Component({
  selector: 'app-pedido-venda',
  standalone: true,
  imports: [
    FormsModule,
    PoPageModule,
    PoDynamicModule,
    PoTableModule,
    PoButtonModule,
    PoDividerModule,
  ],
  templateUrl: './pedido-venda.html',
  styles: [
    `
      .container-itens {
        padding: 16px;
        background: #fdfdfd;
        border: 1px solid #eeeeee;
        border-radius: 4px;
      }
    `,
  ],
})
export class PedidoVendaComponent {
  private notification: PoNotificationService = inject(PoNotificationService);

  public readonly breadcrumb: PoBreadcrumb = {
    items: [{ label: 'Home', link: '/' }, { label: 'Pedido de Venda' }],
  };

  // Cabeçalho do Pedido (SC5)
  public pedido: PedidoHeader = {
    C5_CLIENTE: '',
    C5_LOJA: '01',
    C5_XORIG: 'Protheus',
    C5_EMISSAO: new Date().toISOString().substring(0, 10),
  };

  public readonly fields: PoDynamicFormField[] = [
    {
      property: 'C5_CLIENTE',
      label: 'Cliente (Cód)',
      gridColumns: 4,
      required: true,
      minLength: 6,
      maxLength: 6,
    },
    { property: 'C5_LOJA', label: 'Loja', gridColumns: 2, required: true, maxLength: 2 },
    { property: 'C5_EMISSAO', label: 'Data Emissão', type: 'date', gridColumns: 3, required: true },
    {
      property: 'C5_XORIG',
      label: 'Origem',
      gridColumns: 3,
      options: [
        { label: 'Protheus', value: 'Protheus' },
        { label: 'CRM', value: 'CRM' },
        { label: 'E-commerce', value: 'Ecommerce' },
      ],
    },
  ];

  // Itens do Pedido (SC6)
  public itens: PedidoItem[] = [];
  public itemSendoEditado: PedidoItem = { C6_PRODUTO: '', C6_QTDVEN: 1, C6_PRCVEN: 0 };

  public readonly itemFields: PoDynamicFormField[] = [
    { property: 'C6_PRODUTO', label: 'Produto (Cód)', gridColumns: 6, required: true },
    { property: 'C6_QTDVEN', label: 'Quantidade', type: 'number', gridColumns: 3, required: true },
    {
      property: 'C6_PRCVEN',
      label: 'Preço Venda',
      type: 'currency',
      gridColumns: 3,
      required: true,
    },
  ];

  public readonly columns: PoTableColumn[] = [
    { property: 'C6_PRODUTO', label: 'Produto' },
    { property: 'C6_QTDVEN', label: 'Qtd', type: 'number' },
    { property: 'C6_PRCVEN', label: 'Preço', type: 'currency', format: 'BRL' },
    { property: 'total', label: 'Total', type: 'currency', format: 'BRL' },
  ];

  adicionarItem() {
    if (!this.itemSendoEditado.C6_PRODUTO || this.itemSendoEditado.C6_QTDVEN <= 0) {
      this.notification.warning('Preencha os campos do item corretamente.');
      return;
    }

    const novoItem: PedidoItem = {
      ...this.itemSendoEditado,
      total: this.itemSendoEditado.C6_QTDVEN * this.itemSendoEditado.C6_PRCVEN,
    };

    this.itens = [...this.itens, novoItem];
    this.itemSendoEditado = { C6_PRODUTO: '', C6_QTDVEN: 1, C6_PRCVEN: 0 };
    this.notification.success('Item adicionado à lista.');
  }

  salvarPedido() {
    if (this.itens.length === 0) {
      this.notification.error('Adicione pelo menos um item ao pedido.');
      return;
    }
    this.notification.information('Integração manual em desenvolvimento.');
    console.log('Pedido para salvar:', { ...this.pedido, itens: this.itens });
  }

  limpar() {
    this.pedido = {
      C5_CLIENTE: '',
      C5_LOJA: '01',
      C5_XORIG: 'Protheus',
      C5_EMISSAO: new Date().toISOString().substring(0, 10),
    };
    this.itens = [];
  }
}
