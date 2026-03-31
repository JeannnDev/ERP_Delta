export interface PedidoCsv {
    C5_FILIAL?: string;
    C5_EMISSAO?: string;
    C5_CLIENTE: string;
    C5_LOJA?: string;
    C5_CONDPAG?: string;
    C5_TABELA?: string;
    C5_VENDEDO?: string;
    C5_OBS?: string;
    C5_EXTERNO: string;
    C6_ITEM?: string;
    C6_PRODUTO: string;
    C6_QTDVEN: number;
    C6_PRCVEN: number;
    C6_DESCONTO?: number;
    invalid?: boolean;
    statusLabel?: string;
    $selected?: boolean; 
}

/** Interface para a visão agrupada (Mestre/Detalhe) */
export interface PedidoAgrupado {
    C5_FILIAL?: string;
    C5_EMISSAO?: string;
    C5_CLIENTE: string;
    C5_LOJA?: string;
    C5_CONDPAG?: string;
    C5_TABELA?: string;
    C5_VENDEDO?: string;
    C5_OBS?: string;
    C5_EXTERNO: string;
    valorTotal: number;
    qtdItens: number;
    invalid: boolean;
    statusLabel: string;
    $selected: boolean;
    detalhe: PedidoCsv[];
}

export interface ItemResultado {
    PEDIDOEXTERNO?: string;
    NUMEROPEDIDO?: string;
    STATUS?: 'sucesso' | 'erro' | 'duplicado';
    MENSAGEM?: string;
    pedidoExterno?: string; // legatário
    numeroPedido?: string; // legatário
    status?: 'sucesso' | 'erro' | 'duplicado'; // legatário
    mensagem?: string; // legatário
}

export interface ResultadoImportacao {
    TOTAL: number;
    SUCESSO: number;
    ERROS: number;
    DUPLICADOS: number;
    ITENS: ItemResultado[];
    total?: number; // legatário
    sucesso?: number; // legatário
    erros?: number; // legatário
    duplicados?: number; // legatário
    itens?: ItemResultado[]; // legatário
}

/** 
 * Interface para representar dados brutos vindo do Excel/CSV.
 * Como o leitor é genérico, as propriedades podem vir tanto do template (Português)
 * quanto direto do mapeamento Protheus (C5_/C6_).
 */
export interface RawRecord {
    // Identificadores comuns
    PedidoExterno?: string | number;
    C5_EXTERNO?: string | number;

    // Campos de Cabeçalho (Master)
    Filial?: string | number;
    Emissao?: string | number;
    Cliente?: string | number;
    CondPag?: string | number;
    TabelaPreco?: string | number;
    Vendedor?: string | number;
    Loja?: string | number;
    Obs?: string;

    // Campos de Itens (Detail)
    Item?: string | number;
    Produto?: string | number;
    C6_PRODUTO?: string | number;
    Quantidade?: number;
    C6_QTDVEN?: number;
    PrecoUnit?: number;
    C6_PRCVEN?: number;
    DescontoPerc?: number;
    C6_DESCONTO?: number;
}

