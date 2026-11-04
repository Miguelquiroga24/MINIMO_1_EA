import { Component, computed, input } from '@angular/core';

// Colores para el fondo de las iniciales cuando el usuario no tiene foto
const COLORS = ['#3b3fb6', '#e8615a', '#1f7a4d', '#9a5b00', '#7a3bb6', '#0e7490', '#b6366f', '#4b5563'];

// La foto de perfil de un usuario, recortada en un círculo. Si no tiene foto, sus iniciales.
// Es un componente hijo: la lista le pasa el nombre y la foto (inputs) y él solo pinta
@Component({
  selector: 'app-avatar',
  imports: [],
  templateUrl: './avatar.html',
  styleUrl: './avatar.css',
})
export class Avatar {
  name = input.required<string>();
  photo = input<string | undefined>();
  // 'sm' en las listas y 'lg' en el formulario
  size = input<'sm' | 'lg'>('sm');

  // "Laia Puig" -> "LP"
  initials = computed(() =>
    this.name()
      .split(' ')
      .filter((part) => part)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join(''),
  );

  // El color sale del nombre: el mismo usuario tiene siempre el mismo color
  color = computed(() => {
    const sum = [...this.name()].reduce((total, letter) => total + letter.charCodeAt(0), 0);
    return COLORS[sum % COLORS.length];
  });
}
