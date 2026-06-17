import { of } from 'rxjs';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ContentApiService } from './content-api.service';
import { ContentListComponent } from './content-list.component';

describe('ContentListComponent', () => {
  it('renders content order and active state', () => {
    TestBed.configureTestingModule({
      imports: [ContentListComponent],
      providers: [
      { provide: ContentApiService, useValue: { list: () => of([{ id: '1', title: 'Agenda', contentType: 'photo', sourceReference: 'x', isActive: true, displayOrder: 2 }]) } },
      provideRouter([])
      ]
    });
    const fixture: ComponentFixture<ContentListComponent> = TestBed.createComponent(ContentListComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Agenda');
    expect(fixture.nativeElement.textContent).toContain('Active');
  });
});
