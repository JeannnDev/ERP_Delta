import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProdutoService } from '../../services/produto.service';
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
import { Produto } from '../../models/produto.model';

@Component({
    selector: 'app-produto',
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
    templateUrl: './produto.html',
    styleUrls: ['./produto.css']
})
export class ProdutoComponent {
    private notification = inject(PoNotificationService);
    private produtoService = inject(ProdutoService);

    produtos = this.produtoService.produtos;
    isLoading = this.produtoService.loading;

    produto: Produto = {};
    isEditing = false;

    pageActions: PoPageAction[] = [
        { label: 'Salvar', action: this.save.bind(this), icon: 'po-icon-ok', disabled: () => !this.produto.B1_COD },
        { label: 'Cancelar', action: this.cancel.bind(this), icon: 'po-icon-close' }
    ];

    fields: PoDynamicFormField[] = [
        { 
            property: 'B1_COD', label: 'Código SKU', gridColumns: 3, required: true, maxLength: 15,
            placeholder: 'PD001'
        },
        { 
            property: 'B1_DESC', label: 'Descrição', gridColumns: 9, required: true, maxLength: 40,
            placeholder: 'PRODUTO TESTE 01'
        },
        {
            property: 'B1_TIPO', label: 'Tipo', gridColumns: 3, 
            options: [
                { label: 'Mercadoria', value: 'PA' },
                { label: 'Matéria-Prima', value: 'MP' },
                { label: 'Serviço', value: 'SV' }
            ]
        },
        { 
            property: 'B1_UM', label: 'Unidade Medida', gridColumns: 2, required: true, maxLength: 2,
            placeholder: 'UN'
        },
        { 
            property: 'B1_LOCPAD', label: 'Armazém Padrão', gridColumns: 2, maxLength: 2,
            placeholder: '01'
        },
        { 
            property: 'B1_GRUPO', label: 'Grupo', gridColumns: 2, maxLength: 4,
            placeholder: '0001'
        },
        { 
            property: 'B1_PRV1', label: 'Preço Venda', gridColumns: 3, type: 'number',
            divider: 'Dados Financeiros'
        },
        { 
            property: 'B1_PESO', label: 'Peso Bruto', gridColumns: 3, type: 'number'
        }
    ];

    onProdutoChange(value: Produto) {
        this.produto = value;
    }

    async save() {
        try {
            await this.produtoService.create(this.produto);
            this.notification.success('Produto criado com sucesso no Protheus!');
            this.produto = {};
        } catch (error: unknown) {
            console.error(error);
            const msg = this.produtoService.message() || 'Erro ao processar cadastro no Advpl.';
            this.notification.error(msg);
        }
    }

    cancel() {
        this.produto = {};
        this.isEditing = false;
        this.notification.information('Operação cancelada.');
    }
}
