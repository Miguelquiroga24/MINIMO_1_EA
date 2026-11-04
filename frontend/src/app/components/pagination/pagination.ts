import { Component, input, output } from '@angular/core';

// Componente hijo: el listado le pasa la página y el total (inputs)
// y él le avisa cuando hay que cambiar de página (output)
@Component({
  selector: 'app-pagination',
  imports: [],
  templateUrl: './pagination.html',
  styleUrl: './pagination.css',
})
export class Pagination {
  page = input.required<number>();
  totalPages = input.required<number>();
  pageChange = output<number>();
}
