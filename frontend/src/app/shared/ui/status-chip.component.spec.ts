import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { provideExtendedColors } from '../../core/theme/extended-colors';
import { StatusChipComponent } from './status-chip.component';

describe('StatusChipComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [StatusChipComponent, NoopAnimationsModule],
      providers: [provideExtendedColors()]
    });
  });

  it('renders the label with the kind class', () => {
    const fixture = TestBed.createComponent(StatusChipComponent);
    fixture.componentRef.setInput('label', 'Active');
    fixture.componentRef.setInput('kind', 'success');
    fixture.detectChanges();

    const chip = fixture.nativeElement.querySelector('.status-chip');
    expect(chip.textContent).toContain('Active');
    expect(chip.classList).toContain('status-chip--success');
  });

  it('renders an icon when provided', () => {
    const fixture = TestBed.createComponent(StatusChipComponent);
    fixture.componentRef.setInput('label', 'Blocked');
    fixture.componentRef.setInput('kind', 'danger');
    fixture.componentRef.setInput('icon', 'block');
    fixture.detectChanges();

    const icon = fixture.nativeElement.querySelector('mat-icon');
    expect(icon.textContent.trim()).toBe('block');
  });
});
