import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';

import { PoModule } from '@po-ui/ng-components';

@Component({
  selector: 'app-numeric-keyboard',
  standalone: true,
  imports: [PoModule],
  template: `
    <div class="keyboard-container" [class.alphanumeric-mode]="type === 'alphanumeric'">
      <!-- Display -->
      <div class="keyboard-display">
        <div class="display-label">{{ label }}</div>
        <div class="display-main">
          <span class="display-value">{{ value || ' ' }}</span>
          @if (value.length < maxLength) { <span class="cursor"></span> }
        </div>
        <div class="display-count">{{ value.length }}/{{ maxLength }}</div>
      </div>

      <div class="keyboard-body">
        <!-- Teclado Numérico -->
        <div class="numbers-section">
          <div class="keyboard-grid">
            <button class="key num-key" (click)="onKeyPress('1')">1</button>
            <button class="key num-key" (click)="onKeyPress('2')">2</button>
            <button class="key num-key" (click)="onKeyPress('3')">3</button>
            <button class="key num-key" (click)="onKeyPress('4')">4</button>
            <button class="key num-key" (click)="onKeyPress('5')">5</button>
            <button class="key num-key" (click)="onKeyPress('6')">6</button>
            <button class="key num-key" (click)="onKeyPress('7')">7</button>
            <button class="key num-key" (click)="onKeyPress('8')">8</button>
            <button class="key num-key" (click)="onKeyPress('9')">9</button>
            <button class="key danger-key" (click)="onClear()" title="Limpar tudo">
              <po-icon p-icon="an an-trash"></po-icon>
            </button>
            <button class="key num-key" (click)="onKeyPress('0')">0</button>
            <button class="key warning-key" (click)="onBackspace()" title="Apagar">
              <po-icon p-icon="an an-backspace"></po-icon>
            </button>
          </div>
        </div>

        <!-- Teclado Alfabético -->
        @if (type === 'alphanumeric') {
          <div class="letters-section">
            <div class="letters-grid">
              @for (letter of letters; track letter) {
                <button class="key letter-key" (click)="onKeyPress(letter)">{{ letter }}</button>
              }
            </div>
          </div>
        }
      </div>

      <!-- Ações -->
      <div class="keyboard-footer">
        <button class="action-btn cancel-btn" (click)="onCancel()">
          <po-icon p-icon="an an-x"></po-icon> CANCELAR
        </button>
        <button class="action-btn confirm-btn" (click)="onConfirm()">
          <po-icon p-icon="an an-check"></po-icon> CONFIRMAR
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .keyboard-container {
        padding: 24px;
        max-width: 360px;
        margin: 0 auto;
        background: #ffffff;
        border-radius: 20px;
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .keyboard-container.alphanumeric-mode {
        max-width: 600px;
      }

      /* Display Styling */
      .keyboard-display {
        background: #f8fafc;
        border: 2px solid #e2e8f0;
        border-radius: 16px;
        padding: 16px 20px;
        margin-bottom: 24px;
        position: relative;
        box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.05);
      }

      .display-label {
        font-size: 11px;
        font-weight: 600;
        color: #64748b;
        text-transform: uppercase;
        margin-bottom: 4px;
      }

      .display-main {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        min-height: 40px;
      }

      .display-value {
        font-size: 36px;
        font-weight: 700;
        font-family: 'Roboto Mono', monospace;
        color: #0f172a;
        word-break: break-all;
        letter-spacing: 2px;
      }

      .cursor {
        display: inline-block;
        width: 3px;
        height: 32px;
        background: #3b82f6;
        margin-left: 4px;
        animation: blink 1s infinite;
      }

      .display-count {
        position: absolute;
        bottom: 8px;
        left: 20px;
        font-size: 10px;
        font-weight: 700;
        color: #94a3b8;
      }

      @keyframes blink {
        50% { opacity: 0; }
      }

      .keyboard-body {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }

      .alphanumeric-mode .keyboard-body {
        flex-direction: row;
        align-items: flex-start;
      }

      /* Grid Styling */
      .numbers-section {
        flex: 0 0 240px;
      }

      .keyboard-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
      }

      .letters-section {
        flex: 1;
        background: #f1f5f9;
        padding: 16px;
        border-radius: 16px;
        border: 1px solid #e2e8f0;
      }

      .letters-grid {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 8px;
      }

      /* Key Styling */
      .key {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 64px;
        font-size: 24px;
        font-weight: 700;
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        color: #1e293b;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
      }

      .letter-key {
        height: 48px;
        font-size: 18px;
        border-radius: 8px;
      }

      .key:hover {
        background: #f8fafc;
        border-color: #3b82f6;
        color: #3b82f6;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
      }

      .key:active {
        transform: translateY(0);
        background: #eff6ff;
      }

      .danger-key {
        background: #fff1f2;
        border-color: #fecdd3;
        color: #e11d48;
      }

      .danger-key:hover {
        background: #e11d48;
        color: white;
        border-color: #e11d48;
      }

      .warning-key {
        background: #fefce8;
        border-color: #fef08a;
        color: #a16207;
      }

      .warning-key:hover {
        background: #facc15;
        color: #ffffff;
        border-color: #facc15;
      }

      /* Footer Actions */
      .keyboard-footer {
        display: flex;
        gap: 16px;
        margin-top: 24px;
      }

      .action-btn {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        height: 56px;
        border: none;
        border-radius: 14px;
        font-size: 14px;
        font-weight: 800;
        cursor: pointer;
        transition: all 0.3s ease;
      }

      .cancel-btn {
        background: #f1f5f9;
        color: #64748b;
      }

      .cancel-btn:hover {
        background: #e2e8f0;
        color: #0f172a;
      }

      .confirm-btn {
        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
        color: #ffffff;
        box-shadow: 0 4px 14px rgba(37, 99, 235, 0.3);
      }

      .confirm-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(37, 99, 235, 0.4);
      }

      /* Responsiveness */
      @media (max-width: 640px) {
        .keyboard-container.alphanumeric-mode {
          max-width: 100%;
        }
        .alphanumeric-mode .keyboard-body {
          flex-direction: column;
        }
        .numbers-section {
          flex: none;
          width: 100%;
        }
        .letters-grid {
          grid-template-columns: repeat(6, 1fr);
        }
      }
    `,
  ],
})
export class NumericKeyboardComponent {
  @Input() value = '';
  @Input() label = 'Informe o valor';
  @Input() maxLength = 12;
  @Input() type: 'numeric' | 'alphanumeric' = 'numeric';
  @Output() valueChange = new EventEmitter<string>();
  @Output() confirm = new EventEmitter<string>();
  @Output() keyboardClose = new EventEmitter<void>();

  letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    const key = event.key.toUpperCase();
    if (event.key >= '0' && event.key <= '9') {
      this.onKeyPress(event.key);
    } else if (this.type === 'alphanumeric' && /^[A-Z]$/.test(key)) {
      this.onKeyPress(key);
    } else if (event.key === 'Backspace') {
      this.onBackspace();
    } else if (event.key === 'Enter') {
      this.onConfirm();
    }
  }

  @HostListener('window:paste', ['$event'])
  handlePaste(event: ClipboardEvent) {
    const pastedText = event.clipboardData?.getData('text');
    if (pastedText) {
      const allowedText = this.type === 'numeric' 
        ? pastedText.replace(/\D/g, '') 
        : pastedText.toUpperCase().replace(/[^A-Z0-9]/g, '');
      
      if (allowedText) {
        this.value = (this.value + allowedText).substring(0, this.maxLength);
        this.valueChange.emit(this.value);
      }
    }
  }

  onKeyPress(key: string): void {
    if (this.value.length < this.maxLength) {
      this.value = this.value + key;
      this.valueChange.emit(this.value);
    }
  }

  onBackspace(): void {
    if (this.value.length > 0) {
      this.value = this.value.slice(0, -1);
      this.valueChange.emit(this.value);
    }
  }

  onClear(): void {
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
