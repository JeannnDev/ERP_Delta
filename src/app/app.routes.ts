import { Routes } from '@angular/router';
import { ConsultaDocumento } from './components/consulta-documento/consulta-documento';
import { FornecedorComponent } from './components/fornecedor/fornecedor';

export const routes: Routes = [
    { path: '', redirectTo: 'consulta', pathMatch: 'full' },
    { path: 'consulta', component: ConsultaDocumento },
    { path: 'fornecedor', component: FornecedorComponent },
];
