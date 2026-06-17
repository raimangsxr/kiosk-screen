import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { AdminApiService } from './admin-api.service';
import { UsersRolesComponent } from './users-roles.component';

describe('UsersRolesComponent', () => {
  it('lists users and creates users with selected roles', () => {
    const api = jasmine.createSpyObj<AdminApiService>('AdminApiService', ['listUsers', 'createUser', 'updateUser']);
    api.listUsers.and.returnValue(of([{ id: 'user-1', email: 'admin@example.com', displayName: 'Admin', isActive: true, roles: ['administrator'] }]));
    api.createUser.and.returnValue(of({ id: 'user-2', email: 'operator@example.com', displayName: 'Operator', isActive: true, roles: ['event_operator'] }));

    TestBed.configureTestingModule({
      imports: [UsersRolesComponent],
      providers: [{ provide: AdminApiService, useValue: api }]
    });
    const fixture = TestBed.createComponent(UsersRolesComponent);
    fixture.detectChanges();

    fixture.componentInstance.email = 'operator@example.com';
    fixture.componentInstance.displayName = 'Operator';
    fixture.componentInstance.roles = ['event_operator'];
    fixture.componentInstance.submit();

    expect(fixture.nativeElement.textContent).toContain('admin@example.com');
    expect(api.createUser).toHaveBeenCalledWith({
      email: 'operator@example.com',
      displayName: 'Operator',
      isActive: true,
      roles: ['event_operator']
    });
  });
});
