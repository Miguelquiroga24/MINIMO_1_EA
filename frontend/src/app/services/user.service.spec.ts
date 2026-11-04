import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../environments/environment';
import { UserFilters } from '../models';
import { UserService } from './user.service';

describe('UserService', () => {
  let service: UserService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/users`;
  const noFilters: UserFilters = { search: '', role: '', active: '', degree: '', archived: false };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(UserService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('asks for the page and the limit and does not send empty filters', () => {
    service.getUsers(2, 10, noFilters).subscribe();

    const req = httpMock.expectOne(`${baseUrl}?page=2&limit=10`);
    expect(req.request.method).toBe('GET');
    req.flush({ users: [], total: 0, page: 2, pages: 0 });
  });

  it('sends every filter that has a value', () => {
    service
      .getUsers(1, 10, {
        search: ' laia ',
        role: 'user',
        active: 'false',
        degree: 'Grau en Enginyeria Telemàtica',
        archived: true,
      })
      .subscribe();

    const req = httpMock.expectOne((request) => request.url === baseUrl);
    expect(req.request.params.get('search')).toBe('laia');
    expect(req.request.params.get('role')).toBe('user');
    expect(req.request.params.get('active')).toBe('false');
    expect(req.request.params.get('degree')).toBe('Grau en Enginyeria Telemàtica');
    expect(req.request.params.get('archived')).toBe('true');
    req.flush({ users: [], total: 0, page: 1, pages: 0 });
  });

  it('archives and restores with a POST and deletes with a DELETE', () => {
    service.archiveUser('u3').subscribe();
    service.restoreUser('u3').subscribe();
    service.deleteUser('u3').subscribe();

    expect(httpMock.expectOne(`${baseUrl}/u3/archive`).request.method).toBe('POST');
    expect(httpMock.expectOne(`${baseUrl}/u3/restore`).request.method).toBe('POST');
    expect(httpMock.expectOne(`${baseUrl}/u3`).request.method).toBe('DELETE');
  });
});
