import { Routes } from '@angular/router';
import { ConsultaDocumento } from './components/consulta-documento/consulta-documento';
import { FornecedorComponent } from './components/fornecedor/fornecedor';
import { UploadComponent } from './components/upload/upload.component';
import { ResultadoComponent } from './components/resultado/resultado.component';
import { ClienteComponent } from './components/cliente/cliente';
import { ProdutoComponent } from './components/produto/produto';

export const routes: Routes = [
    { path: '', redirectTo: 'consulta', pathMatch: 'full' },
    { path: 'consulta', component: ConsultaDocumento },
    { path: 'fornecedor', component: FornecedorComponent },
    { path: 'cliente', component: ClienteComponent },
    { path: 'produto', component: ProdutoComponent },
    { path: 'upload', component: UploadComponent },
    { path: 'resultado', component: ResultadoComponent },
];
