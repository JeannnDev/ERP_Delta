import { Routes } from '@angular/router';
import { ConsultaDocumento } from './components/consulta-documento/consulta-documento';
import { FornecedorComponent } from './components/fornecedor/fornecedor';
import { UploadComponent } from './components/upload/upload.component';
import { ResultadoComponent } from './components/resultado/resultado.component';

export const routes: Routes = [
    { path: '', redirectTo: 'consulta', pathMatch: 'full' },
    { path: 'consulta', component: ConsultaDocumento },
    { path: 'fornecedor', component: FornecedorComponent },
    { path: 'upload', component: UploadComponent },
    { path: 'resultado', component: ResultadoComponent },
];
