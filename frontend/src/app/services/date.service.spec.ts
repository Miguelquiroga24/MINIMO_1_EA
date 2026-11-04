import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../environments/environment';
import { DateService } from './date.service';

describe('DateService', () => {
  let service: DateService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/dates`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(DateService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('sends the status filter only when there is one', () => {
    service.getDates(1, 10, { status: '', user: '' }).subscribe();
    httpMock.expectOne(`${baseUrl}?page=1&limit=10`).flush({ dates: [], total: 0, page: 1, pages: 0 });

    service.getDates(1, 10, { status: 'pending', user: '' }).subscribe();
    httpMock.expectOne(`${baseUrl}?page=1&limit=10&status=pending`).flush({ dates: [], total: 0, page: 1, pages: 0 });
  });

  it('opens, changes the status, extends and deletes', () => {
    service.createDate({ users: ['u2', 'u3'] }).subscribe();
    service.updateStatus('d1', 'ongoing').subscribe();
    service.extendDate('d1').subscribe();
    service.deleteDate('d1').subscribe();

    expect(httpMock.expectOne(baseUrl).request.body).toEqual({ users: ['u2', 'u3'] });
    expect(httpMock.expectOne((request) => request.method === 'PUT').request.body).toEqual({ status: 'ongoing' });
    expect(httpMock.expectOne(`${baseUrl}/d1/extend`).request.method).toBe('POST');
    expect(httpMock.expectOne((request) => request.method === 'DELETE').request.url).toBe(`${baseUrl}/d1`);
  });
});
