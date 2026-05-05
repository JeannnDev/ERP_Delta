// Tipos para os dados de apontamento de produção

export interface Operacao {
  operac: string;
  recurso: string;
  descricao: string;
  recno: number;
  quantidadeSolicitada: number;
  quantidadeProduzida: number;
  quantidadePerdida: number;
  quantidadeFaltante: number;
  parcialTotal: string;
  status: string;
  encerrada?: boolean;
  historico?: HistoricoApontamento[];
  registros?: RegistroApontamento[];
}

export interface HistoricoApontamento {
  tempoApont: string | number;
  recurso: string;
  qtdProd: number;
  qtdPerd: number;
  hrIni: string;
  dtIni: string;
  dtFim: string;
  hrFim: string;
  operadorCod: string;
  operadorNome: string;
}

export interface RegistroApontamento {
  produto: string;
  op: string;
  operac: string;
  recurso: string;
  qtdSol: number;
  qtdProd: number;
  qtdPerd: number;
  pt: string;
}

export interface SaldoItem {
  produto: string;
  um: string;
  qtdeEmp: number;
  saldoEstq: number;
  armz: string;
  endereco: string;
  status: boolean;
  descricao?: string;
}

export interface OPApiData {
  status: string;
  op: string;
  produto: string;
  descProduto: string;
  roteiroOp?: string;
  roteiroUtilizado: string;
  nest: number;
  quantidade: number;
  quantidadeSolicitada?: number;
  previsaoIni: string;
  dtEntrega: string;
  previsaoEntrega: string;
  observacao: string;
  dtEmissao: string;
  qtdProduzida: number;
  situacao: string;
  tipoOp: string;
  tpProducao: string;
  opTerceiro: string;
  nf?: string;
  armazem?: string;
  operacoes: Operacao[];
  saldo_item: SaldoItem[];
  roteiro?: Record<string, Operacao[]>;
}

export interface ApontamentoData {
  opNumber: string;
  operatorCode: string;
  operatorName?: string;
  operatorPassword?: string;
  operation: string;
  resource: string;
  quantityProduced: string;
  loss: string;
  apiData?: OPApiData | null;
  selectedResource?: RecursoApontamento;
}

export interface RecursoApontamento {
  codigo: string;
  descricao: string;
}

export interface Impressora {
  id: string;
  name: string;
  zplId: string;
}

export interface Etiqueta {
  id: string;
  name: string;
  origem: string;
  zpl: string;
  sequencia: string;
}

export interface ApontamentoPayload {
  ORDEMPRODUCAO: string;
  PRODUTO: string;
  OPERACAO: string;
  RECURSO: string;
  FERRAMENTA: string;
  DATAINI: string;
  HORAINI: string;
  DATAFIM: string;
  HORAFIM: string;
  QUANTIDADE: number;
  PERDA: number;
  PARCTOTAL: string;
  DATAAPONTAMENTO: string;
  DESDOBRAMENTO: string;
  TEMPOREAL: string;
  LOTE: string;
  SUBLOTE: string;
  VALIDLOTE: string;
  OBSERVACAO: string;
  OPERADOR: string;
  PERDAANTERIOR: number;
  SEQROTALT: string;
  QTD2UM: number;
  POTENCIA: number;
  RATEIO: number;
  STATUS: string;
  ARMAZEM: string;
  PERIMP: number;
  QTDEGANHO: number;
  NEST: string;
}

export interface ImpressaoPayload {
  Op: string;
  IdZpl: string;
  Quant: number;
  Layout: string;
}

export interface ApontamentoApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  status?: number;
}
