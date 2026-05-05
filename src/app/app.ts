import { Component, signal, inject } from '@angular/core';
import {
  RouterOutlet,
  Router,
  NavigationStart,
  NavigationEnd,
  NavigationCancel,
  NavigationError,
} from '@angular/router';
import { PoMenuModule, PoMenuItem, PoToolbarModule, PoLoadingModule } from '@po-ui/ng-components';

import { LoadingService } from './services/loading.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, PoMenuModule, PoToolbarModule, PoLoadingModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('Angular_tst');
  private router = inject(Router);
  public loadingService = inject(LoadingService);

  constructor() {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        this.loadingService.show(); // Inicia o bloqueio da tela
      } else if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      ) {
        // Fallback: Se o componente não avisar que terminou, liberamos em 1.5s
        setTimeout(() => this.loadingService.hide(), 1500);
      }
    });
  }

  readonly menus: PoMenuItem[] = [
    {
      label: 'Cadastros',
      icon: 'an an-users',
      subItems: [
        { label: 'Fornecedores', link: '/fornecedor', icon: 'an an-identification-card' },
        { label: 'Consulta', link: '/consulta', icon: 'an an-magnifying-glass' },
      ],
    },
    {
      label: 'Pedidos de Venda',
      icon: 'an an-shopping-cart',
      subItems: [
        { label: 'Pedido de Venda', link: '/pedido-venda', icon: 'an an-plus' },
        { label: 'Importar Pedidos', link: '/upload', icon: 'an an-upload-simple' },
      ],
    },
    {
      label: 'Clientes',
      icon: 'an an-user',
      subItems: [
        { label: 'Clientes', link: '/cliente', icon: 'an an-user' },
        { label: 'Importar Clientes', link: '/upload-cliente', icon: 'an an-upload-simple' },
      ],
    },
    {
      label: 'Produtos',
      icon: 'an an-package',
      subItems: [
        { label: 'Produtos', link: '/produto', icon: 'an an-package' },
        { label: 'Importar Produtos', link: '/upload-produto', icon: 'an an-upload-simple' },
      ],
    },
    {
      label: 'Controle de Produção',
      icon: 'an an-factory',
      subItems: [
        { label: 'Apontamento', link: '/apontamento', icon: 'an an-desktop' },
        { label: 'Imprimir Etiqueta', link: '/etiqueta', icon: 'an an-printer' },
        { label: 'Histórico de OP', link: '/historico-op', icon: 'an an-clock-counter-clockwise' },
      ],
    },
  ];
}
