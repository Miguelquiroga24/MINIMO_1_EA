import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'truncate',
})
export class TruncatePipe implements PipeTransform {
  transform(value: string | undefined | null, limit = 80, trail = '...'): string {
    if (!value) return '';
    const cleanValue = value.replace(/\s+/g, ' ').trim();
    return cleanValue.length > limit ? cleanValue.substring(0, limit).trim() + trail : cleanValue;
  }
}
