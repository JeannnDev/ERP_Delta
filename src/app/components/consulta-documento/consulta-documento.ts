import { Component, signal, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { LoadingService } from '../../services/loading.service';
import { FormsModule } from '@angular/forms';
import { FornecedorService } from '../../services/fornecedor.service';
import { Fornecedor } from '../../models/fornecedor.model';

import {
    PoButtonModule,
    PoDividerModule,
    PoFieldModule,
    PoLoadingModule,
    PoNotificationService,
    PoPageModule,
    PoTableModule,
    PoTagModule,
    PoTagType,
    PoInfoModule,
    PoContainerModule,
    PoRadioGroupModule,
    PoDynamicModule,
} from '@po-ui/ng-components';

export type TipoDocumento = 'cpf' | 'cnpj';

export interface ResultadoConsulta {
    documento: string;
    tipo: TipoDocumento;
    nome: string;
    situacao: string;
    dataAbertura?: string;
    municipio?: string;
    uf?: string;
    email?: string;
    telefone?: string;
    atividade?: string;
    naturezaJuridica?: string;
}

@Component({
    selector: 'app-consulta-documento',
    imports: [
        CommonModule,
        FormsModule,
        PoButtonModule,
        PoDividerModule,
        PoFieldModule,
        PoLoadingModule,
        PoPageModule,
        PoTableModule,
        PoTagModule,
        PoInfoModule,
        PoContainerModule,
        PoRadioGroupModule,
        PoDynamicModule,
    ],
    templateUrl: './consulta-documento.html',
    styleUrl: './consulta-documento.css',
    providers: [PoNotificationService],
})
export class ConsultaDocumento implements OnInit {
    private poNotification = inject(PoNotificationService);
    private loadingService = inject(LoadingService);
    private platformId = inject(PLATFORM_ID);

    /* ------------------------------------------------------------------ *
     * Estado                                                              *
     * ------------------------------------------------------------------ */
    tipoDocumento: TipoDocumento = 'cpf';
    carregandoTela = true;
    documento = '';
    carregando = signal(false);
    resultado = signal<ResultadoConsulta | null>(null);
    erroDocumento = '';

    /* ------------------------------------------------------------------ *
     * Opções de tipo de documento                                         *
     * ------------------------------------------------------------------ */
    opcoesDocumento = [
        { label: 'CPF', value: 'cpf' },
        { label: 'CNPJ', value: 'cnpj' },
    ];

    /* ------------------------------------------------------------------ *
     * Labels dinâmicos de acordo com o tipo selecionado                  *
     * ------------------------------------------------------------------ */
    get labelDocumento(): string {
        return this.tipoDocumento === 'cpf' ? 'CPF' : 'CNPJ';
    }

    get maskDocumento(): string {
        return this.tipoDocumento === 'cpf'
            ? '999.999.999-99'
            : '99.999.999/9999-99';
    }

    get placeholderDocumento(): string {
        return this.tipoDocumento === 'cpf'
            ? 'Ex.: 000.000.000-00'
            : 'Ex.: 00.000.000/0000-00';
    }

    /* ------------------------------------------------------------------ *
     * Breadcrumb                                                          *
     * ------------------------------------------------------------------ */
    breadcrumb = {
        items: [
            { label: 'Home', link: '/' },
            { label: 'Consulta de Documentos' },
        ],
    };

    /* ------------------------------------------------------------------ *
     * Campos de visualização (Dynamic View)                              *
     * ------------------------------------------------------------------ */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public getViewFields(): any[] {
        return [
            { property: 'documento', label: this.labelDocumento, gridColumns: 3 },
            { property: 'nome', label: this.tipoDocumento === 'cpf' ? 'Nome' : 'Razão Social', gridColumns: 9 },
            { property: 'situacao', label: 'Situação', gridColumns: 3, tag: true, color: (v: string) => this.corSituacao(v) },
            { property: 'municipio', label: 'Município', gridColumns: 5 },
            { property: 'uf', label: 'UF', gridColumns: 4 },
            { property: 'email', label: 'E-mail', gridColumns: 6, divider: 'Contatos Próximos' },
            { property: 'telefone', label: 'Telefone', gridColumns: 6 }
        ];
    }

    colunas = [
        { property: 'documento', label: 'Documento' },
        { property: 'tipo', label: 'Tipo' },
        { property: 'nome', label: 'Nome / Razão Social' },
        { property: 'situacao', label: 'Situação' },
        { property: 'municipio', label: 'Município' },
        { property: 'uf', label: 'UF' },
    ];

    historico = signal<ResultadoConsulta[]>([]);

    ngOnInit() {
        if (isPlatformBrowser(this.platformId)) {
            // Simula o tempo de carregamento inicial (ajuste para seu banco de dados)
            setTimeout(() => {
                this.loadingService.hide(); // Só destrava agora que terminou tudo!
            }, 800);
        }
    }

    /* ------------------------------------------------------------------ *
     * Ao trocar tipo, limpa documento e resultado                         *
     * ------------------------------------------------------------------ */
    onTipoChange(tipo: TipoDocumento) {
        this.tipoDocumento = tipo;
        this.documento = '';
        this.resultado.set(null);
        this.erroDocumento = '';
    }

    /* ------------------------------------------------------------------ *
     * Validação de formato CPF/CNPJ                                      *
     * ------------------------------------------------------------------ */
    private validarDocumento(valor: string, tipo: TipoDocumento): boolean {
        const numeros = valor.replace(/\D/g, '');
        return tipo === 'cpf' ? numeros.length === 11 : numeros.length === 14;
    }

    private fornecedorService = inject(FornecedorService);

    /* ------------------------------------------------------------------ *
     * Consulta (Real – Consumindo WebService Advpl)                      *
     * ------------------------------------------------------------------ */
    async consultar() {
        const doc = this.documento.replace(/\D/g, ''); // Remove máscara para consulta
        const tipo = this.tipoDocumento;

        if (!doc || doc.trim() === '') {
            this.poNotification.warning(`Informe o ${this.labelDocumento}.`);
            return;
        }

        if (!this.validarDocumento(doc, tipo)) {
            this.erroDocumento = `${this.labelDocumento} inválido.`;
            return;
        }

        this.erroDocumento = '';
        this.resultado.set(null);
        this.carregando.set(true);

        try {
            // Chama o WebService passando o CPF/CNPJ limpo
            await this.fornecedorService.getAll(doc);
            
            // Pega o primeiro resultado da lista (geralmente consulta por CGC retorna 1)
            const list: Fornecedor[] = this.fornecedorService.fornecedores();
            
            if (list.length > 0) {
                // ... ( mapeamento já existente)
                const item = list[0];
                const dados: ResultadoConsulta = {
                    documento: item.A2_CGC || doc,
                    tipo: tipo,
                    nome: item.A2_NOME || 'Não Identificado',
                    situacao: 'Ativa',
                    municipio: item.A2_MUN,
                    uf: item.A2_EST,
                    email: item.A2_EMAIL || '',
                    telefone: item.A2_TEL || ''
                };

                this.resultado.set(dados);

                const existe = this.historico().some((h) => h.documento === dados.documento);
                if (!existe) {
                    this.historico.update((l) => [dados, ...l]);
                }

                this.poNotification.success(`Consulta realizada com sucesso!`);
            } else {
                // Aqui capturamos a mensagem correta que o Protheus enviou
                const msg = this.fornecedorService.message() || 'Nenhum fornecedor encontrado no Protheus.';
                this.poNotification.error(msg);
            }
        } catch {
            const serviceMsg = this.fornecedorService.message();
            if (serviceMsg) {
                this.poNotification.error(serviceMsg);
            } else {
                this.poNotification.error('Erro ao comunicar com o servidor Protheus.');
            }
        } finally {
            this.carregando.set(false);
        }
    }

    limpar() {
        this.documento = '';
        this.resultado.set(null);
        this.erroDocumento = '';
    }

    /* ------------------------------------------------------------------ *
     * Retorna o PoTagType correto para cada situação                     *
     * ------------------------------------------------------------------ */
    corSituacao(situacao: string): PoTagType {
        const mapa: Record<string, PoTagType> = {
            Regular: PoTagType.Success,
            Ativa: PoTagType.Success,
            Suspensa: PoTagType.Warning,
            Inapta: PoTagType.Danger,
            Cancelada: PoTagType.Danger,
            Irregular: PoTagType.Danger,
        };
        return mapa[situacao] ?? PoTagType.Info;
    }
}
