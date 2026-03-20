import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PoMenuModule, PoMenuItem, PoToolbarModule } from '@po-ui/ng-components';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, PoMenuModule, PoToolbarModule, PoMenuModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('Angular_tst');


  readonly menus: Array<PoMenuItem> =
    [
      { label: 'Cadastro fornecedor', link: '/fornecedor', icon: 'an an-identification-card' },
      { label: 'Consulta fornecedor', link: '/consulta', icon: 'an an-magnifying-glass' }
    ];
}
