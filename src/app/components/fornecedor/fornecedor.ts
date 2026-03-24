import { Component, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FornecedorService } from '../../services/fornecedor.service';
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
import { Fornecedor } from '../../models/fornecedor.model';

@Component({
    selector: 'app-fornecedor',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        PoPageModule,
        PoDynamicModule,
        PoButtonModule,
        PoLoadingModule,
        PoListViewModule,
        PoDividerModule,
    ],
    templateUrl: './fornecedor.html',
    styleUrls: ['./fornecedor.css']
})
export class FornecedorComponent {
    private notification = inject(PoNotificationService);
    private fornecedorService = inject(FornecedorService);

    // Signals expostos pelo Service (Reativo e Rápido)
    fornecedores = this.fornecedorService.fornecedores;
    isLoading = this.fornecedorService.loading;

    // Dados para o formulário
    fornecedor: Fornecedor = {};
    isEditing = false;

    pageActions: PoPageAction[] = [
        { label: 'Salvar', action: this.save.bind(this), icon: 'po-icon-ok', disabled: () => Object.keys(this.fornecedor).length === 0 },
        { label: 'Cancelar', action: this.cancel.bind(this), icon: 'po-icon-close' }
    ];

    fields: PoDynamicFormField[] = [
        { 
            property: 'A2_COD', label: 'Código', gridColumns: 2, required: true, maxLength: 6,
            placeholder: '000001'
        },
        { 
            property: 'A2_LOJA', label: 'Loja', gridColumns: 2, required: true, maxLength: 2,
            placeholder: '01'
        },
        { 
            property: 'A2_CGC', label: 'CPF / CNPJ', gridColumns: 4, required: true, 
            mask: '99.999.999/9999-99' 
        },
        {
            property: 'A2_TIPO', label: 'Tipo', gridColumns: 4, 
            options: [
                { label: 'Jurídica', value: 'J' },
                { label: 'Física', value: 'F' }
            ]
        },
        { 
            property: 'A2_NOME', label: 'Nome / Razão Social', gridColumns: 7, required: true,
            maxLength: 40, divider: 'Dados Cadastrais'
        },
        { 
            property: 'A2_NREDUZ', label: 'Nome Fantasia', gridColumns: 5,
            maxLength: 20
        },
        { 
            property: 'A2_MUN', label: 'Município', gridColumns: 10,
            maxLength: 15, divider: 'Localização'
        },
        { 
            property: 'A2_EST', label: 'Estado (UF)', gridColumns: 2,
            maxLength: 2, placeholder: 'SP'
        },
        { 
            property: 'A2_END', label: 'Endereço Completo', gridColumns: 12,
            maxLength: 40
        }
    ];

    prepareCreate() {
        this.fornecedor = {};
    }

    async save() {
        try {
            await this.fornecedorService.create(this.fornecedor);
            this.notification.success('Fornecedor criado com sucesso no Protheus!');
            this.fornecedor = {};
        } catch (error) {
            const msg = this.fornecedorService.message() || 'Erro ao processar cadastro no Advpl.';
            this.notification.error(msg);
        }
    }

    cancel() {
        this.fornecedor = {};
        this.isEditing = false;
        this.notification.information('Operação cancelada.');
    }
}
