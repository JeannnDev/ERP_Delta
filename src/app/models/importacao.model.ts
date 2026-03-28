export interface PedidoCsv {
    pedidoExterno: string;
    cliente: string;
    produto: string;
    quantidade: number;
    preco: number;
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
