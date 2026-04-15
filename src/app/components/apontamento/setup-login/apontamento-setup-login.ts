import { Component, inject } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PoModule, PoNotificationService } from '@po-ui/ng-components';
import { ApontamentoApiService } from '../../../services/apontamento-api.service';
import { ApontamentoService } from '../../../services/apontamento.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-apontamento-setup-login',
  standalone: true,
  imports: [FormsModule, PoModule],
  templateUrl: './apontamento-setup-login.html',
  styleUrls: ['./apontamento-setup-login.css'],
})
export class ApontamentoSetupLoginComponent {
  private router = inject(Router);
  private apiService = inject(ApontamentoApiService);
  private apontamentoService = inject(ApontamentoService);
  private notification = inject(PoNotificationService);

  operatorCode = '';
  operatorPassword = '';
  isOperatorConfirmed = false;
  isLoading = false;

  get canProceed(): boolean {
    return !!(this.operatorCode?.trim() && this.operatorPassword?.trim());
  }

  onOperatorEnter(): void {
    if (this.operatorCode?.trim()) {
      this.isOperatorConfirmed = true;
    }
  }

  async handleNext(): Promise<void> {
    if (!this.canProceed) return;

    this.isLoading = true;

    try {
      const result = await firstValueFrom(
        this.apiService.validateOperador(
          this.operatorCode,
          this.operatorPassword,
          this.apontamentoService.operadores(),
        ),
      );

      if (result?.success) {
        sessionStorage.setItem(
          'setupOperator',
          JSON.stringify({
            code: this.operatorCode,
            name: result.data?.nome || '',
          }),
        );
        this.router.navigate(['/apontamento/setup']);
      } else {
        this.notification.error(result?.error || 'Falha na autenticação Admin');
      }
    } catch {
      this.notification.error('Erro ao validar operador');
    } finally {
      this.isLoading = false;
    }
  }

  goBack(): void {
    this.router.navigate(['/apontamento']);
  }
}
