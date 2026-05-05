import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PoModule, PoNotificationService } from '@po-ui/ng-components';
import { ApontamentoApiService } from '../../../services/apontamento-api.service';
import { ApontamentoService } from '../../../services/apontamento.service';
import { RecursoApontamento } from '../../../models/apontamento.model';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-apontamento-setup-login',
  standalone: true,
  imports: [FormsModule, PoModule],
  templateUrl: './apontamento-setup-login.html',
  styleUrls: ['./apontamento-setup-login.css'],
})
export class ApontamentoSetupLoginComponent implements OnInit {
  private router = inject(Router);
  private apiService = inject(ApontamentoApiService);
  private apontamentoService = inject(ApontamentoService);
  private notification = inject(PoNotificationService);

  // Recurso (máquina)
  recursoCode = '';
  recursoDescricao = '';
  isRecursoValido = false;
  isRecursoConfirmed = false;
  availableRecursos: RecursoApontamento[] = [];
  isLoadingRecursos = true;

  // Operador
  operatorCode = '';
  operatorPassword = '';
  isOperatorConfirmed = false;
  isLoading = false;

  get canProceed(): boolean {
    return !!(
      this.isRecursoValido &&
      this.operatorCode?.trim() &&
      this.operatorPassword?.trim()
    );
  }

  ngOnInit(): void {
    this.apiService.fetchRecursosAll().subscribe({
      next: (recursos) => {
        this.availableRecursos = recursos;
        this.isLoadingRecursos = false;
        console.log(`[SetupLogin] ${recursos.length} recursos carregados.`);
      },
      error: () => {
        this.isLoadingRecursos = false;
        this.notification.warning('Não foi possível carregar a lista de recursos. Digite o código manualmente.');
      }
    });
  }

  onRecursoChange(codigo: string): void {
    this.recursoCode = codigo;
    this.isRecursoValido = false;
    this.recursoDescricao = '';

    if (!codigo?.trim()) return;

    const encontrado = this.availableRecursos.find(
      r => r.codigo.toLowerCase() === codigo.trim().toLowerCase()
    );

    if (encontrado) {
      this.recursoDescricao = encontrado.descricao;
      this.isRecursoValido = true;
    }
  }

  onRecursoEnter(): void {
    if (this.isRecursoValido) {
      this.isRecursoConfirmed = true;
    } else if (this.recursoCode?.trim()) {
      // Se não achou na lista mas tem código, aceita (fallback offline)
      this.isRecursoValido = true;
      this.isRecursoConfirmed = true;
    }
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
            recurso: this.recursoCode.trim(),
            recursoDescricao: this.recursoDescricao,
          }),
        );
        this.router.navigate(['/apontamento/setup']);
      } else {
        this.notification.error(result?.error || 'Falha na autenticação');
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
