import { Component, signal, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { LoadingService } from '../../services/loading.service';
import { FormsModule } from '@angular/forms';

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
     * Colunas da tabela de histórico                                      *
     * ------------------------------------------------------------------ */
    colunas = [
        { property: 'documento', label: 'Documento', type: 'string' },
        { property: 'tipo', label: 'Tipo', type: 'string' },
        { property: 'nome', label: 'Nome / Razão Social', type: 'string' },
        { property: 'situacao', label: 'Situação', type: 'string' },
        { property: 'municipio', label: 'Município', type: 'string' },
        { property: 'uf', label: 'UF', type: 'string' },
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

    /* ------------------------------------------------------------------ *
     * Consulta (mock – substitua por chamada ao seu serviço real)        *
     * ------------------------------------------------------------------ */
    consultar() {
        const doc = this.documento;
        const tipo = this.tipoDocumento;

        if (!doc || doc.trim() === '') {
            this.erroDocumento = `Informe o ${this.labelDocumento}.`;
            return;
        }

        if (!this.validarDocumento(doc, tipo)) {
            this.erroDocumento = `${this.labelDocumento} inválido. Verifique o número informado.`;
            return;
        }

        this.erroDocumento = '';
        this.resultado.set(null);
        this.carregando.set(true);

        // ── Mock assíncrono – substitua pelo HttpClient ──────────────────
        setTimeout(() => {
            this.carregando.set(false);

            const mockCpf: ResultadoConsulta = {
                documento: doc,
                tipo: 'cpf',
                nome: 'João da Silva Souza',
                situacao: 'Regular',
                municipio: 'São Paulo',
                uf: 'SP',
                email: 'joao.silva@email.com',
                telefone: '(11) 9 8765-4321',
            };

            const mockCnpj: ResultadoConsulta = {
                documento: doc,
                tipo: 'cnpj',
                nome: 'EMPRESA EXEMPLO LTDA',
                situacao: 'Ativa',
                dataAbertura: '15/03/2010',
                municipio: 'Curitiba',
                uf: 'PR',
                email: 'contato@empresa.com.br',
                telefone: '(41) 3333-4444',
                atividade: 'Desenvolvimento de Software',
                naturezaJuridica: 'Sociedade Empresária Limitada',
            };

            const dados = tipo === 'cpf' ? mockCpf : mockCnpj;
            this.resultado.set(dados);

            const existe = this.historico().some((h) => h.documento === dados.documento);
            if (!existe) {
                this.historico.update((list) => [dados, ...list]);
            }

            this.poNotification.success(`${this.labelDocumento} consultado com sucesso!`);
        }, 1500);
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
