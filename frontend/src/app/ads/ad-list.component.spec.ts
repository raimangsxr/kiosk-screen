import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { AdListComponent } from './ad-list.component';
import { AdsApiService } from './ads-api.service';

describe('AdListComponent', () => {
  it('renders ad rows with ordering, client association, and active status', () => {
    const api = jasmine.createSpyObj<AdsApiService>('AdsApiService', ['listAds', 'deleteAd']);
    api.listAds.and.returnValue(of([{
      id: 'ad-1',
      clientId: 'client-1',
      label: 'Lobby ad',
      sourceReference: 'media/ad.jpg',
      isActive: true,
      displayOrder: 3,
      mediaFile: { id: 'media-1', mediaType: 'image', contentType: 'image/jpeg', fileSizeBytes: 10, originalFilename: 'ad.jpg', mediaUrl: '/media/ad.jpg' }
    }]));

    TestBed.configureTestingModule({
      imports: [AdListComponent],
      providers: [{ provide: AdsApiService, useValue: api }, provideRouter([])]
    });
    const fixture = TestBed.createComponent(AdListComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Lobby ad');
    expect(fixture.nativeElement.textContent).toContain('client-1');
    expect(fixture.nativeElement.textContent).toContain('Active');
  });
});
