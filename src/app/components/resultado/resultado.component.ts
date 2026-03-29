import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { 
  PoPageModule, 
  PoTableModule, 
  PoTagModule, 
  PoInfoModule, 
  PoDividerModule,
  PoTableColumn,
  PoNotificationService
} from '@po-ui/ng-components';
import { ResultadoImportacao } from '../../models/importacao.model';

@Component({
  selector: 'app-resultado',
  standalone: true,
  imports: [
    CommonModule, 
    PoPageModule, 
    PoTableModule, 
    PoTagModule, 
    PoInfoModule,
    PoDividerModule
  ],
  templateUrl: './resultado.component.html',
  styleUrls: ['./resultado.component.css']
})
export class ResultadoComponent implements OnInit {
  
  resultado?: ResultadoImportacao;
  
  // Injeções
  private router = inject(Router);
  private notification = inject(PoNotificationService);

  readonly tableColumns: PoTableColumn[] = [
    { property: 'pedidoExterno', label: 'Ped. Externo' },
    { property: 'numeroPedido', label: 'Nº SC5' },
    { property: 'status', label: 'Status', type: 'label', labels: [
      { value: 'sucesso', label: 'Sucesso', color: 'color-11', icon: 'po-icon-ok' },
      { value: 'erro', label: 'Erro', color: 'color-07', icon: 'po-icon-close' },
      { value: 'duplicado', label: 'Duplicado', color: 'color-08', icon: 'po-icon-warning' }
    ]},
    { property: 'mensagem', label: 'Mensagem' }
  ];

  constructor() {
    const navigation = this.router.getCurrentNavigation();
    this.resultado = navigation?.extras?.state?.['resultado'];
  }

  ngOnInit(): void {
    if (!this.resultado) {
      this.notification.warning('Dados de importação não encontrados.');
      this.router.navigate(['/upload']);
    }
  }

  voltar() {
    this.router.navigate(['/upload']);
  }
}
