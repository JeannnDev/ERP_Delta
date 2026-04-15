import { Routes } from '@angular/router';
import { ConsultaDocumento } from './components/consulta-documento/consulta-documento';
import { FornecedorComponent } from './components/fornecedor/fornecedor';
import { UploadComponent } from './components/upload/upload.component';
import { ResultadoComponent } from './components/resultado/resultado.component';
import { ClienteComponent } from './components/cliente/cliente';
import { ProdutoComponent } from './components/produto/produto';
import { UploadClienteComponent } from './components/upload-cliente/upload-cliente.component';
import { UploadProdutoComponent } from './components/upload-produto/upload-produto.component';
import { PedidoVendaComponent } from './components/pedido-venda/pedido-venda';
import { ApontamentoHomeComponent } from './components/apontamento/home/apontamento-home';
import { ApontamentoLoginComponent } from './components/apontamento/login/apontamento-login';
import { ApontamentoRecursoComponent } from './components/apontamento/recurso/apontamento-recurso';
import { ApontamentoQuantidadeComponent } from './components/apontamento/quantidade/apontamento-quantidade';
import { ApontamentoResumoComponent } from './components/apontamento/resumo/apontamento-resumo';
import { ApontamentoSetupComponent } from './components/apontamento/setup/apontamento-setup';
import { ApontamentoSetupLoginComponent } from './components/apontamento/setup-login/apontamento-setup-login';

export const routes: Routes = [
    { path: '', redirectTo: 'consulta', pathMatch: 'full' },
    { path: 'consulta', component: ConsultaDocumento },
    { path: 'fornecedor', component: FornecedorComponent },
    { path: 'cliente', component: ClienteComponent },
    { path: 'upload-cliente', component: UploadClienteComponent },
    { path: 'produto', component: ProdutoComponent },
    { path: 'upload-produto', component: UploadProdutoComponent },
    { path: 'pedido-venda', component: PedidoVendaComponent },
    { path: 'upload', component: UploadComponent },
    { path: 'resultado', component: ResultadoComponent },
    { path: 'apontamento', component: ApontamentoHomeComponent },
    { path: 'apontamento/login', component: ApontamentoLoginComponent },
    { path: 'apontamento/recurso', component: ApontamentoRecursoComponent },
    { path: 'apontamento/quantidade', component: ApontamentoQuantidadeComponent },
    { path: 'apontamento/resumo', component: ApontamentoResumoComponent },
    { path: 'apontamento/setup', component: ApontamentoSetupComponent },
    { path: 'apontamento/setup-login', component: ApontamentoSetupLoginComponent },
];
