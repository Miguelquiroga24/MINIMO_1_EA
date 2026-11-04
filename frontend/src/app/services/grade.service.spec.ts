import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../environments/environment';
import { GradeService } from './grade.service';

describe('GradeService', () => {
  let service: GradeService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/grades`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(GradeService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('sends only the filters that have a value', () => {
    service.getGrades(1, 10, { value: '', user: '' }).subscribe();
    httpMock.expectOne(`${baseUrl}?page=1&limit=10`).flush({ grades: [], total: 0, page: 1, pages: 0 });

    service.getGrades(1, 10, { value: 'A+', user: 'u3' }).subscribe();
    const req = httpMock.expectOne((request) => request.url === baseUrl);
    expect(req.request.params.get('value')).toBe('A+');
    expect(req.request.params.get('user')).toBe('u3');
    req.flush({ grades: [], total: 0, page: 1, pages: 0 });
  });

  it('creates, changes the value and deletes', () => {
    service.createGrade({ from: 'u3', to: 'u4', value: 'A+' }).subscribe();
    service.updateGrade('g1', 'F').subscribe();
    service.deleteGrade('g1').subscribe();

    const create = httpMock.expectOne(baseUrl);
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toEqual({ from: 'u3', to: 'u4', value: 'A+' });

    const update = httpMock.expectOne((request) => request.method === 'PUT');
    expect(update.request.url).toBe(`${baseUrl}/g1`);
    expect(update.request.body).toEqual({ value: 'F' });

    expect(httpMock.expectOne((request) => request.method === 'DELETE').request.url).toBe(`${baseUrl}/g1`);
  });
});
