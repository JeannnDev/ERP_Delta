import { Component, Input, Output, EventEmitter } from '@angular/core';

import { PoModule } from '@po-ui/ng-components';

@Component({
  selector: 'app-apontamento-step-indicator',
  standalone: true,
  imports: [PoModule],
  template: `
    <div class="step-indicator-container">
      @for (step of steps; track step.id; let last = $last) {
        <div
          class="step-item"
          [class.active-item]="step.id === currentStep"
          [class.completed-item]="step.id < currentStep"
        >
          <!-- Linha Conectora -->
          @if (!last) {
            <div class="step-connector" [class.completed]="step.id < currentStep"></div>
          }

          <!-- Círculo -->
          <div class="circle-wrapper">
            <button
              class="step-circle"
              type="button"
              [class.completed]="step.id < currentStep"
              [class.active]="step.id === currentStep"
              [class.pending]="step.id > currentStep"
              [disabled]="step.id >= currentStep"
              (click)="onStepClick(step.id)"
            >
              @if (step.id < currentStep) {
                <po-icon p-icon="po-icon-check"></po-icon>
              } @else {
                <po-icon [p-icon]="step.icon" [class.active-icon]="step.id === currentStep">
                </po-icon>
              }
            </button>
          </div>

          <!-- Label -->
          <span
            class="step-label"
            [class.active-label]="step.id === currentStep"
            [class.completed-label]="step.id < currentStep"
          >
            {{ step.label }}
          </span>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .step-indicator-container {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        width: 100%;
        padding: 24px 16px;
        position: relative;
      }

      @media (min-width: 768px) {
        .step-indicator-container {
          flex-direction: column;
          height: 100%;
          padding: 40px 0;
          justify-content: flex-start;
          align-items: center;
        }
      }

      .step-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        flex: 1;
        position: relative;
        z-index: 1;
      }

      @media (min-width: 768px) {
        .step-item {
          flex: none;
          width: 100%;
          margin-bottom: 80px;
        }
      }

      .circle-wrapper {
        position: relative;
        z-index: 5;
        background: white;
        border-radius: 50%;
        padding: 4px;
      }

      .step-circle {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        border: 2px solid #dfe1e6;
        background-color: #f4f5f7;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s;
        cursor: default;
        outline: none;
        padding: 0;
      }

      @media (min-width: 768px) {
        .step-circle {
          width: 56px;
          height: 56px;
        }
      }

      .step-circle po-icon {
        font-size: 18px;
        color: #94a3b8;
      }

      @media (min-width: 768px) {
        .step-circle po-icon {
          font-size: 24px;
        }
      }

      .step-circle.completed {
        background-color: #22c55e;
        border-color: #22c55e;
        cursor: pointer;
      }

      .step-circle.completed po-icon {
        color: white !important;
      }

      .step-circle.completed:hover {
        transform: scale(1.1);
        box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
      }

      .step-circle.active {
        background-color: #14253d;
        border-color: #14253d;
        transform: scale(1.2);
        box-shadow: 0 4px 12px rgba(20, 37, 61, 0.4);
      }

      .step-circle.active po-icon {
        color: white !important;
      }

      .step-connector {
        position: absolute;
        background-color: #e2e8f0;
        z-index: 2;
        top: 26px;
        left: 50%;
        width: 100%;
        height: 3px;
      }

      @media (min-width: 768px) {
        .step-connector {
          top: 40px;
          bottom: -80px;
          left: 50%;
          width: 3px;
          height: auto;
          transform: translateX(-50%);
        }
      }

      .step-connector.completed {
        background-color: #22c55e;
      }

      .step-label {
        margin-top: 12px;
        font-size: 13px;
        font-weight: 700;
        color: #64748b;
        text-align: center;
        white-space: nowrap;
        position: relative;
        z-index: 5;
        background-color: white;
        padding: 6px 12px;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        border: 1px solid #f1f5f9;
      }

      @media (max-width: 576px) {
        .step-label {
          font-size: 10px;
          padding: 4px;
        }
        .step-label:not(.active-label) {
          display: none;
        }
      }

      .step-label.active-label {
        color: #14253d;
        transform: scale(1.1);
      }

      .step-label.completed-label {
        color: #16a34a;
      }
    `,
  ],
})
export class ApontamentoStepIndicatorComponent {
  @Input() currentStep = 1;
  @Input() totalSteps = 4;
  @Output() stepClick = new EventEmitter<number>();

  steps = [
    { id: 1, label: 'Início', icon: 'an an-factory' },
    { id: 2, label: 'Operação', icon: 'an an-gear' },
    { id: 3, label: 'Quantidade', icon: 'an an-plus-circle' },
    { id: 4, label: 'Resumo', icon: 'an an-check' },
  ];

  onStepClick(stepId: number): void {
    if (stepId < this.currentStep) {
      this.stepClick.emit(stepId);
    }
  }
}
