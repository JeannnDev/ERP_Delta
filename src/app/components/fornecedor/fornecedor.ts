import { Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { LoadingService } from '../../services/loading.service';
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
    private notification = inject(PoNotificationService);
    private loadingService = inject(LoadingService);
    private platformId = inject(PLATFORM_ID);

    isLoading = true;
    fornecedor: Record<string, unknown> = {};

    pageActions: PoPageAction[] = [
        { label: 'Salvar', action: this.save.bind(this), icon: 'po-icon-ok' },
        { label: 'Cancelar', action: this.cancel.bind(this) }
    ];

    fields: PoDynamicFormField[] = [
        { property: 'codigo', label: 'Código', gridColumns: 2, required: false, disabled: true },
        { property: 'nome', label: 'Nome / Razão Social', gridColumns: 6, required: true },
        { property: 'cnpj', label: 'CNPJ / CPF', mask: '99.999.999/9999-99', gridColumns: 4 },
        { property: 'email', label: 'E-mail', gridColumns: 6, format: 'Email' },
        { property: 'telefone', label: 'Telefone', mask: '(99) 99999-9999', gridColumns: 6 },
        { property: 'endereco', label: 'Endereço', gridColumns: 12 }
    ];

    ngOnInit() {
        if (isPlatformBrowser(this.platformId)) {
            // Simula o tempo de carregar os dados reais (ajuste conforme seu banco)
            setTimeout(() => {
                this.loadingService.hide(); // Só fecha quando os dados "chegarem"
            }, 600);
        }
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
