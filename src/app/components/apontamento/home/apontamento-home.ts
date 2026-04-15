import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { PoModule } from '@po-ui/ng-components';

@Component({
  selector: 'app-apontamento-home',
  standalone: true,
  imports: [PoModule],
  templateUrl: './apontamento-home.html',
  styleUrls: ['./apontamento-home.css'],
})
export class ApontamentoHomeComponent {
  private router = inject(Router);

  iniciarApontamento(): void {
    this.router.navigate(['/apontamento/login']);
  }

  abrirConfiguracoes(): void {
    this.router.navigate(['/apontamento/setup-login']);
  }
}
