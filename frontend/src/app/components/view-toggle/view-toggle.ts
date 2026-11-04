import { Component, model } from '@angular/core';

export type ViewMode = 'list' | 'cards';

// Leo el modo que se guardó la última vez en el navegador. Si no hay nada, empiezo en lista
export function savedViewMode(key: string): ViewMode {
  return localStorage.getItem(key) === 'cards' ? 'cards' : 'list';
}

// Botones para elegir si la lista se ve en tabla o en tarjetas.
// Con model() el padre lo usa con two-way binding: <app-view-toggle [(mode)]="viewMode" />
@Component({
  selector: 'app-view-toggle',
  imports: [],
  templateUrl: './view-toggle.html',
  styleUrl: './view-toggle.css',
})
export class ViewToggle {
  mode = model<ViewMode>('list');
}
