import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { environment } from '../../../environments/environment';
import { UserRole } from '../../models';
import { AuthService } from '../../services/auth.service';
import { DateForm } from './date-form';

describe('DateForm', () => {
  let component: DateForm;
  let fixture: ComponentFixture<DateForm>;
  let httpMock: HttpTestingController;

  async function setup(role: UserRole): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [DateForm],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'dates', children: [] }]),
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    TestBed.inject(AuthService).login({ email: 'x@example.com', password: 'studate26' }).subscribe();
    httpMock
      .expectOne(`${environment.apiUrl}/auth/login`)
      .flush({ token: 't', user: { _id: 'u2', name: 'Usuario', email: 'x@example.com', role } });

    fixture = TestBed.createComponent(DateForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  afterEach(() => httpMock.verify());

  it('a user picks only who to meet, from the directory, and is the other one', async () => {
    await setup('user');
    httpMock.expectOne(`${environment.apiUrl}/users/directory`).flush({ users: [{ _id: 'u12', name: 'Oriol Costa' }] });

    component.form.controls.userB.setValue('u12');
    component.save();

    const req = httpMock.expectOne(`${environment.apiUrl}/dates`);
    expect(req.request.body).toEqual({ users: ['u2', 'u12'] });
    req.flush({ date: {} });
  });

  it('the admin picks both users and they cannot be the same', async () => {
    await setup('admin');
    httpMock.expectOne((request) => request.url === `${environment.apiUrl}/users`).flush({ users: [], total: 0, page: 1, pages: 0 });

    component.form.setValue({ userA: 'u3', userB: 'u3' });
    expect(component.form.hasError('sameUser')).toBe(true);
  });
});
