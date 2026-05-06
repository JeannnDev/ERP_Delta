import { Component, signal, inject, OnInit, AfterViewInit, ViewChild, ChangeDetectorRef } from '@angular/core';
import {
  RouterOutlet,
  Router,
  NavigationStart,
  NavigationEnd,
  NavigationCancel,
  NavigationError,
} from '@angular/router';
import { PoMenuModule, PoMenuItem, PoToolbarModule, PoLoadingModule, PoDividerModule, PoMenuComponent } from '@po-ui/ng-components';

import { LoadingService } from './services/loading.service';
import { ApontamentoService } from './services/apontamento.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, PoMenuModule, PoToolbarModule, PoLoadingModule, CommonModule, PoDividerModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit, AfterViewInit {
  protected readonly title = signal('Angular_tst');
  private router = inject(Router);
  public loadingService = inject(LoadingService);
  public apontamentoService = inject(ApontamentoService);
  private cdr = inject(ChangeDetectorRef);
  
  isMenuCollapsed = signal(false);
  menus: PoMenuItem[] = [];

  @ViewChild(PoMenuComponent) poMenu!: PoMenuComponent;

  ngOnInit() {
    this.isMenuCollapsed.set(false); // Garante que inicie aberto
    this.updateMenus();
  }

  ngAfterViewInit() {
    // Observa o tamanho real do menu no DOM para não depender de eventos não documentados do PO UI
    const menuElement = document.querySelector('po-menu');
    if (menuElement) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const width = entry.contentRect.width;
          
          // Ignora se a largura for 0 (ainda não renderizado ou escondido)
          if (width === 0) return;

          // Se a largura for menor que 100px (ex: 64px), o menu está colapsado
          const isCollapsed = width < 100;
          
          if (this.isMenuCollapsed() !== isCollapsed) {
            this.isMenuCollapsed.set(isCollapsed);
            this.cdr.detectChanges();
          }
        }
      });
      resizeObserver.observe(menuElement);
      
      // Força o menu a abrir no carregamento inicial, ignorando a detecção automática momentaneamente
      setTimeout(() => {
        this.isMenuCollapsed.set(false);
        this.cdr.detectChanges();
      }, 100);
    }
  }

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

  updateMenus() {
    this.menus = [
      {
        label: 'Controle de Produção',
        shortLabel: 'Produção',
        icon: 'an an-factory',
        subItems: [
          { label: 'Apontamento', link: '/apontamento', icon: 'an an-desktop' },
          { label: 'Imprimir Etiqueta', link: '/etiqueta', icon: 'an an-printer' },
          {
            label: 'Histórico de OP',
            link: '/historico-op',
            icon: 'an an-clock-counter-clockwise',
          },
        ],
      },
    ];
  }
}
