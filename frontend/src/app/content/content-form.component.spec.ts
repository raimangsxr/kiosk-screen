import { of } from 'rxjs';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ContentApiService } from './content-api.service';
import { ContentFormComponent } from './content-form.component';

describe('ContentFormComponent', () => {
  it('submits non-technical content fields', () => {
    const api = jasmine.createSpyObj<ContentApiService>('ContentApiService', ['create']);
    api.create.and.returnValue(of({ id: '1', title: 'Agenda', contentType: 'photo', sourceReference: 'x', isActive: true, displayOrder: 1 }));
    TestBed.configureTestingModule({ imports: [ContentFormComponent], providers: [{ provide: ContentApiService, useValue: api }] });
    const fixture: ComponentFixture<ContentFormComponent> = TestBed.createComponent(ContentFormComponent);
    const component = fixture.componentInstance;
    component.title = 'Agenda';
    component.sourceReference = 'https://example.com/agenda.jpg';

    component.submit();

    expect(api.create).toHaveBeenCalled();
    expect(component.saved).toBeTrue();
  });
});
