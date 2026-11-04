import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { environment } from '../../../environments/environment';
import { Grade } from '../../models';
import { GradesList } from './grades-list';

const laiaToPau: Grade = {
  _id: 'g1',
  from: { _id: 'u3', name: 'Laia Puig', email: 'laia@example.com' },
  to: { _id: 'u4', name: 'Pau Ferrer', email: 'pau@example.com' },
  value: 'A+',
  createdAt: '2026-11-03T10:00:00.000Z',
};

describe('GradesList', () => {
  let component: GradesList;
  let fixture: ComponentFixture<GradesList>;
  let httpMock: HttpTestingController;
  const gradesUrl = `${environment.apiUrl}/grades`;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GradesList],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(GradesList);
    component = fixture.componentInstance;
    fixture.detectChanges();

    httpMock.expectOne(`${gradesUrl}?page=1&limit=10`).flush({ grades: [laiaToPau], total: 1, page: 1, pages: 1 });
    // Los usuarios del filtro
    httpMock.expectOne((request) => request.url === `${environment.apiUrl}/users`).flush({ users: [], total: 0, page: 1, pages: 0 });
    await fixture.whenStable();
  });

  afterEach(() => httpMock.verify());

  it('paints who votes, who is voted and the value', () => {
    fixture.detectChanges();
    const row = (fixture.nativeElement as HTMLElement).querySelector('tbody tr');

    expect(row?.textContent).toContain('Laia Puig');
    expect(row?.textContent).toContain('Pau Ferrer');
    expect(row?.textContent).toContain('A+');
    expect(row?.textContent).toContain('Cambiar a F');
  });

  it('changes A+ to F and reloads the page', () => {
    component.toggleValue(laiaToPau);

    const req = httpMock.expectOne(`${gradesUrl}/g1`);
    expect(req.request.body).toEqual({ value: 'F' });
    req.flush({ grade: { ...laiaToPau, value: 'F' } });

    httpMock.expectOne(`${gradesUrl}?page=1&limit=10`).flush({ grades: [{ ...laiaToPau, value: 'F' }], total: 1, page: 1, pages: 1 });
    expect(component.grades()[0].value).toBe('F');
  });

  it('filters by value from the first page', () => {
    component.value.set('F');
    component.loadPage(1);

    httpMock.expectOne(`${gradesUrl}?page=1&limit=10&value=F`).flush({ grades: [], total: 0, page: 1, pages: 0 });
    expect(component.total()).toBe(0);
  });

  it('deletes after confirming', () => {
    component.askDelete(laiaToPau);
    expect(component.deleteMessage()).toContain('Laia Puig');

    component.confirmDelete();
    expect(httpMock.expectOne(`${gradesUrl}/g1`).request.method).toBe('DELETE');
  });
});
