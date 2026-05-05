import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';

import { PoModule } from '@po-ui/ng-components';

@Component({
  selector: 'app-numeric-keyboard',
  standalone: true,
  imports: [PoModule],
  template: `
    <div class="keyboard-container">
      <!-- Display -->
      <div class="keyboard-display">
        <span class="display-value">{{ value || '0' }}</span>
      </div>

      <!-- Teclado -->
      <div class="keyboard-grid">
        <button class="key" (click)="onKeyPress('1')">1</button>
        <button class="key" (click)="onKeyPress('2')">2</button>
        <button class="key" (click)="onKeyPress('3')">3</button>
        <button class="key" (click)="onKeyPress('4')">4</button>
        <button class="key" (click)="onKeyPress('5')">5</button>
        <button class="key" (click)="onKeyPress('6')">6</button>
        <button class="key" (click)="onKeyPress('7')">7</button>
        <button class="key" (click)="onKeyPress('8')">8</button>
        <button class="key" (click)="onKeyPress('9')">9</button>
        <button class="key danger" (click)="onClear()">
          <po-icon p-icon="an an-trash"></po-icon>
        </button>
        <button class="key" (click)="onKeyPress('0')">0</button>
        <button class="key" (click)="onBackspace()">
          <po-icon p-icon="an an-backspace"></po-icon>
        </button>
      </div>

      <!-- Ações -->
      <div class="keyboard-actions">
        <po-button p-label="Cancelar" p-kind="secondary" (p-click)="onCancel()"></po-button>
        <po-button p-label="Confirmar" p-kind="primary" (p-click)="onConfirm()"></po-button>
      </div>
    </div>
  `,
  styles: [
    `
      .keyboard-container {
        padding: 16px;
        max-width: 320px;
        margin: 0 auto;
      }

      .keyboard-display {
        background: #f7f9fc;
        border: 2px solid #dfe1e6;
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 16px;
        text-align: right;
      }

      .display-value {
        font-size: 32px;
        font-weight: 600;
        font-family: 'Roboto Mono', monospace;
        color: #172b4d;
      }

      .keyboard-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
        margin-bottom: 16px;
      }

      .key {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 56px;
        font-size: 24px;
        font-weight: 500;
        background: white;
        border: 1px solid #dfe1e6;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s ease;
        color: #172b4d;
      }

      .key:hover {
        background: #f4f5f7;
        border-color: #c1c7d0;
      }

      .key:active {
        transform: scale(0.95);
        background: #ebecf0;
      }

      .key.danger {
        background: #ffebe6;
        border-color: #de350b;
        color: #de350b;
      }

      .key.danger:hover {
        background: #ffbdad;
      }

      .key po-icon {
        font-size: 20px;
      }

      .keyboard-actions {
        display: flex;
        gap: 12px;
        justify-content: space-between;
      }

      .keyboard-actions po-button {
        flex: 1;
      }
    `,
  ],
})
export class NumericKeyboardComponent {
  @Input() value = '';
  @Input() maxLength = 12;
  @Output() valueChange = new EventEmitter<string>();
  @Output() confirm = new EventEmitter<void>();
  @Output() keyboardClose = new EventEmitter<void>();

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (event.key >= '0' && event.key <= '9') {
      this.onKeyPress(event.key);
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
      const numbersOnly = pastedText.replace(/\D/g, '');
      if (numbersOnly) {
        this.value = (this.value + numbersOnly).substring(0, this.maxLength);
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
    this.confirm.emit();
  }
  onCancel(): void {
    this.keyboardClose.emit();
  }
}
