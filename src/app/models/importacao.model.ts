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
    C6_TES?: string;
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

/** Retorno por pedido, espelhando exatamente o JSON do WS ADVPL */
export interface ItemResultado {
    pedidoExterno: string;
    numeroPedido?: string;
    status: 'sucesso' | 'erro' | 'duplicado';
    mensagem: string;
}

/** Retorno geral do WS ADVPL - campos em minúsculo */
export interface ResultadoImportacao {
    total: number;
    sucesso: number;
    erros: number;
    duplicados: number;
    itens: ItemResultado[];
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
    Tes?: string;
    C6_TES?: string;
}

/** Payload de item enviado ao Protheus */
export interface ItemPayload {
    C6_ITEM?: string;
    C6_PRODUTO: string;
    C6_QTDVEN: number;
    C6_PRCVEN: number;
    C6_DESCONTO?: number;
    C6_TES?: string;
}

/** Payload de pedido enviado ao Protheus (estrutura com itens aninhados) */
export interface OrderPayload {
    C5_EXTERNO: string;
    C5_FILIAL?: string;
    C5_EMISSAO?: string;
    C5_CLIENTE: string;
    C5_CONDPAG?: string;
    itens: ItemPayload[];
}

