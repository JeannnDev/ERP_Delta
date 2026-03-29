import { Component, signal, inject } from '@angular/core';
import { RouterOutlet, Router, NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';
import { PoMenuModule, PoMenuItem, PoToolbarModule, PoLoadingModule } from '@po-ui/ng-components';
import { CommonModule } from '@angular/common';
import { LoadingService } from './services/loading.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, PoMenuModule, PoToolbarModule, PoLoadingModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('Angular_tst');
  private router = inject(Router);
  public loadingService = inject(LoadingService);

  constructor() {
    this.router.events.subscribe(event => {
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
      label: 'Fornecedores',
      icon: 'an an-users',
      subItems: [
        { label: 'Cadastro', link: '/fornecedor', icon: 'an an-identification-card' },
        { label: 'Consulta', link: '/consulta', icon: 'an an-magnifying-glass' }
      ]
    },
    {
      label: 'Pedidos de Compra',
      icon: 'an an-shopping-cart',
      subItems: [
        { label: 'Importar Pedidos', link: '/upload', icon: 'an an-upload-simple' }
      ]
    }
  ];
}
