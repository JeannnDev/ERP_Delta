import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
    PoPageModule,
    PoDynamicModule,
    PoPageAction,
    PoDynamicFormField,
    PoNotificationService,
    PoButtonModule,
    PoLoadingModule,
} from '@po-ui/ng-components';

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
    ],
    templateUrl: './fornecedor.html',
    styleUrls: ['./fornecedor.css']
})
export class Fornecedor implements OnInit {
    isLoading: boolean = false;
    fornecedor: any = {};

    pageActions: Array<PoPageAction> = [
        { label: 'Salvar', action: this.save.bind(this), icon: 'po-icon-ok' },
        { label: 'Cancelar', action: this.cancel.bind(this) }
    ];

    fields: Array<PoDynamicFormField> = [
        { property: 'codigo', label: 'Código', gridColumns: 2, required: false, disabled: true },
        { property: 'nome', label: 'Nome / Razão Social', gridColumns: 6, required: true },
        { property: 'cnpj', label: 'CNPJ / CPF', mask: '99.999.999/9999-99', gridColumns: 4 },
        { property: 'email', label: 'E-mail', gridColumns: 6, format: 'Email' },
        { property: 'telefone', label: 'Telefone', mask: '(99) 99999-9999', gridColumns: 6 },
        { property: 'endereco', label: 'Endereço', gridColumns: 12 }
    ];

    constructor(private notification: PoNotificationService) { }

    ngOnInit() {
        this.isLoading = true; // Liga o loading quando a página abre

        // Simula o tempo de carregar os dados num banco (ex: 1 segundo)
        setTimeout(() => {
            this.isLoading = false; // Desliga o loading
        }, 1000);
    }

    save() {
        this.notification.success('Fornecedor salvo com sucesso!');
        console.log('Dados do fornecedor:', this.fornecedor);
        // Reinicia o formulário
        this.fornecedor = {};
    }

    cancel() {
        this.fornecedor = {};
        this.notification.information('Operação cancelada.');
    }
}
