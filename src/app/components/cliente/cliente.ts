import { Component, inject } from '@angular/core';

import { ClienteService } from '../../services/cliente.service';
import { FormsModule } from '@angular/forms';
import {
  PoPageModule,
  PoDynamicModule,
  PoPageAction,
  PoDynamicFormField,
  PoNotificationService,
  PoButtonModule,
  PoLoadingModule,
  PoListViewModule,
  PoDividerModule,
} from '@po-ui/ng-components';
import { Cliente } from '../../models/cliente.model';

@Component({
  selector: 'app-cliente',
  standalone: true,
  imports: [
    FormsModule,
    PoPageModule,
    PoDynamicModule,
    PoButtonModule,
    PoLoadingModule,
    PoListViewModule,
    PoDividerModule,
  ],
  templateUrl: './cliente.html',
  styleUrls: ['./cliente.css'],
})
export class ClienteComponent {
  private notification = inject(PoNotificationService);
  private clienteService = inject(ClienteService);

  clientes = this.clienteService.clientes;
  isLoading = this.clienteService.loading;

  cliente: Cliente = {};
  isEditing = false;

  pageActions: PoPageAction[] = [
    {
      label: 'Salvar',
      action: this.save.bind(this),
      icon: 'po-icon-ok',
      disabled: () => !this.cliente.A1_CGC,
    },
    { label: 'Cancelar', action: this.cancel.bind(this), icon: 'po-icon-close' },
  ];

  fields: PoDynamicFormField[] = [
    {
      property: 'A1_COD',
      label: 'Código',
      gridColumns: 2,
      required: true,
      maxLength: 6,
      placeholder: '000001',
    },
    {
      property: 'A1_LOJA',
      label: 'Loja',
      gridColumns: 2,
      required: true,
      maxLength: 2,
      placeholder: '01',
    },
    {
      property: 'A1_CGC',
      label: 'CPF / CNPJ',
      gridColumns: 4,
      required: true,
      mask: '99.999.999/9999-99',
    },
    {
      property: 'A1_TIPO',
      label: 'Tipo',
      gridColumns: 4,
      options: [
        { label: 'Jurídica', value: 'J' },
        { label: 'Física', value: 'F' },
        { label: 'Exterior', value: 'X' },
      ],
    },
    {
      property: 'A1_NOME',
      label: 'Nome / Razão Social',
      gridColumns: 7,
      required: true,
      maxLength: 40,
      divider: 'Dados Cadastrais',
    },
    {
      property: 'A1_NREDUZ',
      label: 'Nome Fantasia',
      gridColumns: 5,
      maxLength: 20,
    },
    {
      property: 'A1_MUN',
      label: 'Município',
      gridColumns: 10,
      maxLength: 15,
      divider: 'Localização',
    },
    {
      property: 'A1_EST',
      label: 'Estado (UF)',
      gridColumns: 2,
      maxLength: 2,
      placeholder: 'SP',
    },
    {
      property: 'A1_END',
      label: 'Endereço Completo',
      gridColumns: 12,
      maxLength: 40,
    },
  ];

  onClienteChange(value: Cliente) {
    this.cliente = value;
  }

  async save() {
    try {
      await this.clienteService.create(this.cliente);
      this.notification.success('Cliente criado com sucesso no Protheus!');
      this.cliente = {};
    } catch (error: unknown) {
      console.error(error);
      const msg = this.clienteService.message() || 'Erro ao processar cadastro no Advpl.';
      this.notification.error(msg);
    }
  }

  cancel() {
    this.cliente = {};
    this.isEditing = false;
    this.notification.information('Operação cancelada.');
  }
}
