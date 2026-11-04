import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-confirm-modal',
  imports: [],
  templateUrl: './confirm-modal.html',
  styleUrl: './confirm-modal.css',
})
export class ConfirmModal {
  open = input<boolean>(false);
  title = input<string>('¿Estás seguro?');
  message = input<string>('');
  confirmText = input<string>('Confirmar');
  cancelText = input<string>('Cancelar');

  confirmed = output<void>();
  cancelled = output<void>();
}