import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { Router } from '@angular/router';
import { ApontamentoApiService } from './apontamento-api.service';
import { ApontamentoData, OPApiData, Operacao } from '../models/apontamento.model';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ApontamentoService {
  private apiService = inject(ApontamentoApiService);
  private router = inject(Router);

  // ── Estado reativo via Signals ──
  private _data = signal<ApontamentoData>({
    opNumber: '',
    operatorCode: '',
    operation: '',
    resource: '',
    quantityProduced: '',
    loss: '',
  });

  private _startTime = signal<number | null>(null);
  private _endTime = signal<number | null>(null);
  private _elapsedTime = signal<number>(0);
  private _isStarted = signal<boolean>(false);
  private _isFinished = signal<boolean>(false);
  private _isLoadingOP = signal<boolean>(false);
  private _isPaused = signal<boolean>(false);
  private _pausedElapsedTime = signal<number>(0);
  private _isApontando = signal<boolean>(false);
  private _hasApontado = signal<boolean>(false);
  private _operadores = signal<Record<string, unknown>[]>([]);

  // Diálogos de estado
  private _showNoOperationsDialog = signal<boolean>(false);
  private _showError404Dialog = signal<boolean>(false);
  private _error404Message = signal<string>('');
  private _showOpEncTotalDialog = signal<boolean>(false);
  private _showSemSaldoDialog = signal<boolean>(false);
  private _semSaldoMessage = signal<string>('');
  private _showGenericErrorDialog = signal<boolean>(false);
  private _genericErrorMessage = signal<string>('');
  private _showOperatorNotFoundDialog = signal<boolean>(false);
  private _showIncorrectPasswordDialog = signal<boolean>(false);

  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private lastOpConsulted = '';
  private dialogsShownForCurrentOp = new Set<string>();

  // ── Signals públicos (read-only) ──
  readonly data = this._data.asReadonly();
  readonly startTime = this._startTime.asReadonly();
  readonly endTime = this._endTime.asReadonly();
  readonly elapsedTime = this._elapsedTime.asReadonly();
  readonly isStarted = this._isStarted.asReadonly();
  readonly isFinished = this._isFinished.asReadonly();
  readonly isLoadingOP = this._isLoadingOP.asReadonly();
  readonly isPaused = this._isPaused.asReadonly();
  readonly pausedElapsedTime = this._pausedElapsedTime.asReadonly();
  readonly isApontando = this._isApontando.asReadonly();
  readonly hasApontado = this._hasApontado.asReadonly();
  readonly operadores = this._operadores.asReadonly();
  readonly showNoOperationsDialog = this._showNoOperationsDialog.asReadonly();
  readonly showError404Dialog = this._showError404Dialog.asReadonly();
  readonly error404Message = this._error404Message.asReadonly();
  readonly showOpEncTotalDialog = this._showOpEncTotalDialog.asReadonly();
  readonly showSemSaldoDialog = this._showSemSaldoDialog.asReadonly();
  readonly semSaldoMessage = this._semSaldoMessage.asReadonly();
  readonly showGenericErrorDialog = this._showGenericErrorDialog.asReadonly();
  readonly genericErrorMessage = this._genericErrorMessage.asReadonly();
  readonly showOperatorNotFoundDialog = this._showOperatorNotFoundDialog.asReadonly();
  readonly showIncorrectPasswordDialog = this._showIncorrectPasswordDialog.asReadonly();

  // Tempo formatado HH:MM:SS
  readonly formattedElapsedTime = computed(() => {
    const seconds = this._elapsedTime();
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  });

  constructor() {
    this.loadOperators();
    if (typeof window !== 'undefined') {
      this.loadPersistedState();
      effect(() => {
        this.saveState();
      });
    }
  }

  private saveState(): void {
    if (typeof window === 'undefined') return;
    const state = {
      data: this._data(),
      startTime: this._startTime(),
      isStarted: this._isStarted(),
      isPaused: this._isPaused(),
      pausedElapsedTime: this._pausedElapsedTime(),
      elapsedTime: this._elapsedTime()
    };
    localStorage.setItem('apontamento_state', JSON.stringify(state));
  }

  private loadPersistedState(): void {
    const saved = localStorage.getItem('apontamento_state');
    if (saved) {
      try {
        const state = JSON.parse(saved);
        this._data.set(state.data);
        this._startTime.set(state.startTime);
        this._isStarted.set(state.isStarted);
        this._isPaused.set(state.isPaused);
        this._pausedElapsedTime.set(state.pausedElapsedTime);
        this._elapsedTime.set(state.elapsedTime || 0);

        if (state.isStarted && !state.isPaused) {
          this.startTimerInterval();
        }
      } catch (e) {
        console.error('[ApontamentoService] Erro ao carregar estado persistido', e);
      }
    }
  }

  private loadOperators(): void {
    this.apiService.fetchOperadoresList().subscribe((operadores) => {
      this._operadores.set(operadores);
      console.log(`[ApontamentoService] ${operadores.length} operadores carregados para cache.`);
    });
  }

  // ── Atualização de dados ──
  updateData(newData: Partial<ApontamentoData>): void {
    this._data.update((current) => ({ ...current, ...newData }));
  }

  // ── Timer ──
  startTimer(): void {
    const data = this._data();
    if (!data.opNumber?.trim() || !data.operatorCode?.trim()) {
      console.error('[ApontamentoService] OP ou Operador não informados');
      return;
    }
    const now = Date.now();
    this._startTime.set(now);
    this._isStarted.set(true);
    this._isFinished.set(false);
    this._pausedElapsedTime.set(0);
    this.startTimerInterval();
  }

  pauseTimer(): void {
    if (!this._startTime() || this._isFinished()) return;
    const timeSinceStart = Math.floor((Date.now() - this._startTime()!) / 1000);
    this._pausedElapsedTime.set(timeSinceStart);
    this._elapsedTime.set(timeSinceStart);
    this._isPaused.set(true);
    this.stopTimerInterval();
  }

  resumeTimer(): void {
    if (!this._isStarted() || this._isFinished()) return;
    const now = Date.now();
    const adjustedStartTime = now - this._pausedElapsedTime() * 1000;
    this._startTime.set(adjustedStartTime);
    this._pausedElapsedTime.set(0);
    this._isPaused.set(false);
    this.startTimerInterval();
  }

  stopTimer(): void {
    const now = Date.now();
    this._endTime.set(now);
    this._isFinished.set(true);
    if (this._startTime() && now <= this._startTime()!) {
      console.error('[ApontamentoService] Hora de término deve ser maior que início');
      return;
    }
    const finalElapsed = this._startTime() ? Math.floor((now - this._startTime()!) / 1000) : 0;
    this._elapsedTime.set(finalElapsed);
    this.stopTimerInterval();

    if (typeof window !== 'undefined') {
      localStorage.removeItem('apontamento_state');
    }
  }

  resetTimer(): void {
    this.stopTimerInterval();
    this._startTime.set(null);
    this._endTime.set(null);
    this._elapsedTime.set(0);
    this._isStarted.set(false);
    this._isFinished.set(false);
    this._isPaused.set(false);
    this._pausedElapsedTime.set(0);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('apontamento_state');
    }
  }

  private startTimerInterval(): void {
    this.stopTimerInterval();
    this.timerInterval = setInterval(() => {
      if (this._startTime() && !this._endTime() && !this._isPaused()) {
        const timeSinceStart = Math.floor((Date.now() - this._startTime()!) / 1000);
        this._elapsedTime.set(timeSinceStart);
      }
    }, 1000);
  }

  private stopTimerInterval(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  // ── Busca de dados da OP ──
  async fetchAndSetOPData(
    opNumber: string,
    showDialogs = true,
    operatorCode?: string,
    operatorPassword?: string
  ): Promise<{ success: boolean; skipToSummary?: boolean; isOpEncerrada?: boolean }> {
    this._isLoadingOP.set(true);

    const isNewOp = this.lastOpConsulted !== opNumber;
    if (isNewOp) {
      this.lastOpConsulted = opNumber;
      this.dialogsShownForCurrentOp.clear();
    }

    // Helper para executar a chamada e processar a resposta
    const doFetch = async () => {
      return firstValueFrom(
        this.apiService.fetchOPData(
          opNumber,
          operatorCode || this._data().operatorCode,
          operatorPassword || this._data().operatorPassword
        ),
      );
    };

    try {
      // Primeira tentativa
      let result = await doFetch();

      // Se falhou, aguarda 1.5s e tenta novamente (cold-start do Protheus)
      if (!result.success) {
        const errorMsg = result.error || '';
        // Só retenta se NÃO for um erro de negócio definitivo (senha errada, OP não encontrada etc.)
        const isDefinitiveError = errorMsg.includes('Senha incorreta')
          || errorMsg.includes('não cadastrado como operador')
          || errorMsg.includes('não encontrad');

        if (!isDefinitiveError) {
          console.warn('[Service] Primeira tentativa falhou, aguardando 1.5s para retry (cold-start Protheus)...');
          await new Promise(resolve => setTimeout(resolve, 1500));
          result = await doFetch();
          console.log('[Service] Resultado após retry:', result.success ? 'Sucesso' : result.error);
        }
      }

      if (!result.success) {
        const errorMessage = result.error || 'Erro ao buscar dados da OP';

        if (errorMessage.includes('Senha incorreta') || errorMessage.toLowerCase().includes('senha')) {
          this._showIncorrectPasswordDialog.set(true);
          return { success: false };
        }

        if (errorMessage.includes('não cadastrado como operador')) {
          this._showOperatorNotFoundDialog.set(true);
          return { success: false };
        }

        if (errorMessage.includes('não encontrad')) {
          this._error404Message.set(this.formatApiErrorMessage(errorMessage));
          this._showError404Dialog.set(true);
          return { success: false };
        }

        this._genericErrorMessage.set(this.formatApiErrorMessage(errorMessage));
        this._showGenericErrorDialog.set(true);
        return { success: false };
      }

      const opData = result.data!;
      const operacoes = opData.operacoes || [];

      if (operacoes.length === 0) {
        this._showNoOperationsDialog.set(true);
        setTimeout(() => this._showNoOperationsDialog.set(false), 3000);
        return { success: false };
      }

      const updatePayload: Partial<ApontamentoData> = { apiData: opData };

      if (isNewOp || !this._data().operation) {
        updatePayload.operation = operacoes[0]?.operac || '01';
      }

      if (isNewOp) {
        updatePayload.quantityProduced = '';
        updatePayload.loss = '';
        updatePayload.selectedResource = undefined;
      }

      this.updateData(updatePayload);

      const opEncerrada = this.isOpEncerrada(opData, operacoes);

      if (
        opEncerrada &&
        showDialogs &&
        opData.status === 'Enc. Total' &&
        !this.dialogsShownForCurrentOp.has('opEncerrada')
      ) {
        this.dialogsShownForCurrentOp.add('opEncerrada');
        this._showOpEncTotalDialog.set(true);
        return { success: true, skipToSummary: false, isOpEncerrada: true };
      }

      const { temSaldo, mensagem } = this.verificarSaldo(opData);

      if (!temSaldo && !this.dialogsShownForCurrentOp.has('semSaldo')) {
        this.dialogsShownForCurrentOp.add('semSaldo');
        this._semSaldoMessage.set(mensagem);
        this._showSemSaldoDialog.set(true);
        return { success: false };
      }

      return { success: true, skipToSummary: false };
    } catch (error) {
      console.error('[ApontamentoService] Erro ao buscar dados da OP:', error);
      this._genericErrorMessage.set(
        'Erro ao buscar dados da OP. Verifique se a OP existe e está acessível.',
      );
      this._showGenericErrorDialog.set(true);
      return { success: false };
    } finally {
      this._isLoadingOP.set(false);
    }
  }

  private isOpEncerrada(opData: OPApiData, operacoes: Operacao[]): boolean {
    if (opData.status === 'Enc. Total') return true;
    if (operacoes.length > 0) {
      return operacoes.every((op) => {
        if (op.encerrada !== undefined) return op.encerrada;
        if (op.status === 'Finalizado' || op.parcialTotal === 'T') return true;
        if (op.quantidadeSolicitada !== undefined && op.quantidadeProduzida !== undefined) {
          return op.quantidadeSolicitada > 0 && op.quantidadeProduzida === op.quantidadeSolicitada;
        }
        return false;
      });
    }
    return false;
  }

  private verificarSaldo(opData: OPApiData): { temSaldo: boolean; mensagem: string } {
    const saldoItems = opData.saldo_item || [];
    if (saldoItems.length === 0)
      return { temSaldo: false, mensagem: 'Nenhum saldo encontrado para este produto' };
    if (saldoItems.length === 1 && saldoItems[0]?.status === false)
      return { temSaldo: false, mensagem: 'Nenhum saldo encontrado para este produto' };
    if (saldoItems.some((item) => item.status === false))
      return { temSaldo: false, mensagem: 'Saldo indisponível (status inválido)' };
    if (saldoItems.every((item) => item.status === true)) return { temSaldo: true, mensagem: '' };

    const saldoTotal = saldoItems.reduce((sum, item) => sum + (item.saldoEstq || 0), 0);
    const quantidade = opData.quantidade || 0;
    if (saldoTotal >= quantidade) return { temSaldo: true, mensagem: '' };
    return {
      temSaldo: false,
      mensagem: `Saldo insuficiente. Disponível: ${saldoTotal}, Necessário: ${quantidade}`,
    };
  }

  private formatApiErrorMessage(errorMessage: string): string {
    if (!errorMessage) return 'Erro desconhecido';
    let cleanMessage = errorMessage;
    try {
      const parsed = JSON.parse(errorMessage) as { response?: string };
      if (parsed.response) cleanMessage = parsed.response;
    } catch {
      /* ignore */
    }

    cleanMessage = cleanMessage
      .replace(/\\r\\n/g, '\n')
      .replace(/\\n/g, '\n')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .trim();

    const lines = cleanMessage.split('\n');
    const filteredLines = lines.filter((line) => {
      const trimmedLine = line.trim();
      return (
        trimmedLine &&
        !trimmedLine.match(/^-+$/) &&
        !trimmedLine.toLowerCase().includes('processo invalido')
      );
    });

    return filteredLines.join('\n').trim();
  }

  // ── Reset ──
  reset(redirectPath: string | null = '/apontamento'): void {
    const current = this._data();
    this._data.set({
      opNumber: '',
      operatorCode: current.operatorCode,
      operatorName: current.operatorName,
      operatorPassword: current.operatorPassword,
      operation: '',
      resource: '',
      quantityProduced: '',
      loss: '',
      apiData: null,
      selectedResource: undefined,
    });
    this._isStarted.set(false);
    this._isFinished.set(false);
    this._isPaused.set(false);
    this._startTime.set(null);
    this._endTime.set(null);
    this._elapsedTime.set(0);
    this._pausedElapsedTime.set(0);
    this._hasApontado.set(false);
    this.stopTimerInterval();
    if (redirectPath) {
      this.router.navigate([redirectPath]);
    }
  }

  resetOperation(): void {
    this._isStarted.set(false);
    this._isFinished.set(false);
    this._isPaused.set(false);
    this._startTime.set(null);
    this._endTime.set(null);
    this._elapsedTime.set(0);
    this._pausedElapsedTime.set(0);
    this._hasApontado.set(false);
    this.stopTimerInterval();
    this.updateData({ quantityProduced: '', loss: '' });
  }

  // ── Setters de diálogos ──
  setIsApontando(value: boolean): void {
    this._isApontando.set(value);
  }
  setHasApontado(value: boolean): void {
    this._hasApontado.set(value);
  }
  setShowNoOperationsDialog(value: boolean): void {
    this._showNoOperationsDialog.set(value);
  }
  setShowError404Dialog(value: boolean): void {
    this._showError404Dialog.set(value);
  }
  setShowOpEncTotalDialog(value: boolean): void {
    this._showOpEncTotalDialog.set(value);
  }
  setShowSemSaldoDialog(value: boolean): void {
    this._showSemSaldoDialog.set(value);
  }
  setShowGenericErrorDialog(value: boolean): void {
    this._showGenericErrorDialog.set(value);
  }
  setShowOperatorNotFoundDialog(value: boolean): void {
    this._showOperatorNotFoundDialog.set(value);
  }
  setShowIncorrectPasswordDialog(value: boolean): void {
    this._showIncorrectPasswordDialog.set(value);
  }
}
