import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PoModule } from '@po-ui/ng-components';

@Component({
  selector: 'app-password-keyboard',
  standalone: true,
  imports: [CommonModule, PoModule],
  template: `
    <div class="pk-container">

      <!-- Display -->
      <div class="pk-display">
        <div class="pk-display__header">
          <span class="pk-display__label">Senha do Operador</span>
          <span class="pk-display__counter">{{ value.length }} caracteres</span>
        </div>
        
        <div class="pk-display__input-area">
          <div class="pk-display__value-container">
            <span class="pk-display__value">{{ showPassword ? value : maskedValue }}</span>
            <span class="pk-display__cursor"></span>
          </div>
          
          <button class="pk-display__toggle" (click)="toggleShowPassword()" [title]="showPassword ? 'Ocultar' : 'Mostrar'">
            <po-icon [p-icon]="showPassword ? 'an an-eye-slash' : 'an an-eye'"></po-icon>
          </button>
        </div>
      </div>

      <!-- Linha 1: 1-9 0 -->
      <div class="pk-row">
        @for (k of row0; track k) {
          <button class="pk-key pk-key--num" (click)="press(k)">{{ k }}</button>
        }
        <button class="pk-key pk-key--action pk-key--backspace" (click)="backspace()" title="Apagar">
          <po-icon p-icon="an an-backspace"></po-icon>
        </button>
      </div>

      <!-- Linha 2: QWERTYUIOP -->
      <div class="pk-row">
        @for (k of row1; track k) {
          <button class="pk-key" (click)="press(k)">{{ k }}</button>
        }
      </div>

      <!-- Linha 3: ASDFGHJKL -->
      <div class="pk-row pk-row--centered">
        @for (k of row2; track k) {
          <button class="pk-key" (click)="press(k)">{{ k }}</button>
        }
      </div>

      <!-- Linha 4: ZXCVBNM + CAPS -->
      <div class="pk-row pk-row--centered">
        <button
          class="pk-key pk-key--action pk-key--caps"
          [class.pk-key--caps-active]="capsLock"
          (click)="toggleCaps()"
          title="CAPS LOCK">
          <po-icon p-icon="an an-arrow-fat-line-up"></po-icon>
        </button>
        @for (k of row3; track k) {
          <button class="pk-key" (click)="press(k)">{{ k }}</button>
        }
        <button class="pk-key pk-key--danger" (click)="clear()" title="Limpar">
          <po-icon p-icon="an an-trash"></po-icon>
        </button>
      </div>

      <!-- Linha 5: Ações -->
      <div class="pk-actions">
        <button class="pk-btn pk-btn--cancel" (click)="onCancel()">
          <po-icon p-icon="an an-x"></po-icon>
          Cancelar
        </button>
        <button class="pk-key pk-key--space" (click)="press(' ')">ESPAÇO</button>
        <button class="pk-btn pk-btn--confirm" (click)="onConfirm()">
          <po-icon p-icon="an an-check"></po-icon>
          Confirmar
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }

    .pk-container {
      padding: 24px;
      background: #ffffff;
      display: flex;
      flex-direction: column;
      gap: 12px;
      min-width: 650px;
    }

    /* ── DISPLAY ── */
    .pk-display {
      background: #f8fafc;
      border: 2px solid #e2e8f0;
      border-radius: 16px;
      padding: 16px 20px;
      margin-bottom: 20px;
      box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.05);
    }

    .pk-display__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .pk-display__label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: #64748b;
    }

    .pk-display__counter {
      font-size: 10px;
      font-weight: 700;
      color: #94a3b8;
    }

    .pk-display__input-area {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      min-height: 48px;
    }

    .pk-display__value-container {
      display: flex;
      align-items: center;
      flex: 1;
      overflow: hidden;
    }

    .pk-display__value {
      font-family: 'Roboto Mono', monospace;
      font-size: 32px;
      font-weight: 700;
      color: #14253d;
      letter-spacing: 4px;
      white-space: nowrap;
    }

    .pk-display__cursor {
      display: inline-block;
      width: 3px;
      height: 32px;
      background: #3b82f6;
      margin-left: 6px;
      animation: blink 1s infinite;
    }

    @keyframes blink { 50% { opacity: 0; } }

    .pk-display__toggle {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      color: #64748b;
      cursor: pointer;
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
      flex-shrink: 0;
    }

    .pk-display__toggle po-icon {
      font-size: 24px;
      color: #14253d !important;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .pk-display__toggle:hover {
      background: #f8fafc;
      border-color: #14253d;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(20, 37, 61, 0.15);
    }

    .pk-display__toggle:active {
      transform: translateY(0);
    }

    /* ── ROWS ── */
    .pk-row {
      display: flex;
      gap: 8px;
      justify-content: center;
    }

    /* ── KEYS ── */
    .pk-key {
      height: 56px;
      min-width: 50px;
      flex: 1;
      max-width: 64px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      font-size: 18px;
      font-weight: 700;
      color: #1e293b;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
      user-select: none;
    }

    .pk-key:hover {
      background: #f8fafc;
      border-color: #3b82f6;
      color: #3b82f6;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
    }

    .pk-key:active {
      transform: translateY(0);
      background: #eff6ff;
    }

    .pk-key--num {
      background: #f8fafc;
      color: #334155;
    }

    .pk-key--action {
      min-width: 64px;
      background: #f1f5f9;
      color: #475569;
    }

    .pk-key--caps-active {
      background: #14253d !important;
      border-color: #14253d !important;
      color: #ffffff !important;
      box-shadow: 0 4px 12px rgba(20, 37, 61, 0.3);
    }

    .pk-key--danger {
      min-width: 64px;
      background: #fff1f2;
      border-color: #fecdd3;
      color: #e11d48;
    }

    .pk-key--danger:hover {
      background: #e11d48;
      color: white;
      border-color: #e11d48;
    }

    .pk-key--space {
      min-width: 200px;
      max-width: 300px;
      flex: 3;
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 2px;
      color: #64748b;
    }

    /* ── ACTION BUTTONS ── */
    .pk-actions {
      display: flex;
      gap: 12px;
      align-items: center;
      margin-top: 12px;
    }

    .pk-btn {
      height: 56px;
      flex: 1;
      border: none;
      border-radius: 14px;
      font-size: 14px;
      font-weight: 800;
      letter-spacing: 0.5px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      transition: all 0.3s ease;
    }

    .pk-btn--cancel {
      background: #f1f5f9;
      color: #64748b;
    }

    .pk-btn--cancel:hover {
      background: #e2e8f0;
      color: #0f172a;
    }

    .pk-btn--confirm {
      background: linear-gradient(135deg, #14253d 0%, #1e3a5f 100%);
      color: #ffffff;
      box-shadow: 0 4px 14px rgba(20, 37, 61, 0.3);
    }

    .pk-btn--confirm:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(20, 37, 61, 0.4);
    }
  `],
})
export class PasswordKeyboardComponent {
  @Input() value = '';
  @Input() maxLength = 20;
  @Output() valueChange = new EventEmitter<string>();
  @Output() confirm = new EventEmitter<string>();
  @Output() keyboardClose = new EventEmitter<void>();

  capsLock = false;
  showPassword = false;

  row0 = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
  row1Base = ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'];
  row2Base = ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'];
  row3Base = ['Z', 'X', 'C', 'V', 'B', 'N', 'M'];

  get row1() { return this.capsLock ? this.row1Base : this.row1Base.map(k => k.toLowerCase()); }
  get row2() { return this.capsLock ? this.row2Base : this.row2Base.map(k => k.toLowerCase()); }
  get row3() { return this.capsLock ? this.row3Base : this.row3Base.map(k => k.toLowerCase()); }

  get maskedValue(): string {
    return '●'.repeat(this.value.length) || '';
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    if (event.key === 'CapsLock') {
      this.capsLock = !this.capsLock;
      return;
    }
    if (event.key === 'Backspace') { this.backspace(); return; }
    if (event.key === 'Enter') { this.onConfirm(); return; }
    if (event.key === 'Escape') { this.onCancel(); return; }
    if (event.key.length === 1) { this.press(event.key); }
  }

  toggleCaps(): void {
    this.capsLock = !this.capsLock;
  }

  toggleShowPassword(): void {
    this.showPassword = !this.showPassword;
  }

  press(key: string): void {
    if (this.value.length < this.maxLength) {
      this.value = this.value + key;
      this.valueChange.emit(this.value);
    }
  }

  backspace(): void {
    if (this.value.length > 0) {
      this.value = this.value.slice(0, -1);
      this.valueChange.emit(this.value);
    }
  }

  clear(): void {
    this.value = '';
    this.valueChange.emit(this.value);
  }

  onConfirm(): void {
    this.confirm.emit(this.value);
  }

  onCancel(): void {
    this.keyboardClose.emit();
  }
}
