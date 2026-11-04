import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { environment } from '../../../environments/environment';
import { GradeForm } from './grade-form';

describe('GradeForm', () => {
  let component: GradeForm;
  let fixture: ComponentFixture<GradeForm>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GradeForm],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'grades', children: [] }]),
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(GradeForm);
    component = fixture.componentInstance;
    fixture.detectChanges();

    // Solo pide los usuarios activos de rol user
    const users = httpMock.expectOne((request) => request.url === `${environment.apiUrl}/users`);
    expect(users.request.params.get('active')).toBe('true');
    expect(users.request.params.get('role')).toBe('user');
    users.flush({ users: [], total: 0, page: 1, pages: 0 });
  });

  afterEach(() => httpMock.verify());

  it('does not allow a user to vote for themselves', () => {
    component.form.setValue({ from: 'u3', to: 'u3', value: 'A+' });

    expect(component.form.hasError('sameUser')).toBe(true);
    expect(component.form.invalid).toBe(true);
  });

  it('sends the vote', () => {
    component.form.setValue({ from: 'u3', to: 'u4', value: 'F' });
    component.save();

    const req = httpMock.expectOne(`${environment.apiUrl}/grades`);
    expect(req.request.body).toEqual({ from: 'u3', to: 'u4', value: 'F' });
    req.flush({ grade: {} });
  });
});
