export interface PedidoCsv {
    C5_EXTERNO: string;  // ID do pedido vindo do CSV (PedidoExterno)
    C5_CLIENTE: string;  // Código do Cliente
    C6_PRODUTO: string;  // Código do Produto
    C6_QTDVEN: number;   // Quantidade
    C6_PRCVEN: number;   // Preço
    $selected?: boolean; // Usado na PO Table para controle de seleção
}

export interface ItemResultado {
    pedidoExterno: string;
    numeroPedido: string;
    status: 'sucesso' | 'erro' | 'duplicado';
    mensagem: string;
}

export interface ResultadoImportacao {
    total: number;
    sucesso: number;
    erros: number;
    duplicados: number;
    itens: ItemResultado[];
}
