import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { FileInputComponent } from './file-input.component';

function createImageFile(name: string, type: string): File {
  return new File(['content'], name, { type });
}

describe('FileInputComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [FileInputComponent, NoopAnimationsModule]
    });
  });

  it('renders the trigger button and accepts accept attribute', () => {
    const fixture = TestBed.createComponent(FileInputComponent);
    fixture.componentRef.setInput('buttonLabel', 'Upload image');
    fixture.componentRef.setInput('accept', 'image/*');
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('.file-input__button');
    expect(button.textContent).toContain('Upload image');

    const input = fixture.nativeElement.querySelector('input[type="file"]');
    expect(input.getAttribute('accept')).toBe('image/*');
  });

  it('shows the selected filename after a file is chosen', () => {
    const fixture = TestBed.createComponent(FileInputComponent);
    fixture.componentRef.setInput('buttonLabel', 'Upload');
    fixture.detectChanges();

    const component = fixture.componentInstance;
    const file = createImageFile('photo.png', 'image/png');
    const input = fixture.nativeElement.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(input, 'files', { value: [file] });
    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(component['selectedFileName']()).toBe('photo.png');
    expect(fixture.nativeElement.textContent).toContain('photo.png');
  });

  it('emits the fileSelected output when a file is selected', () => {
    const fixture = TestBed.createComponent(FileInputComponent);
    fixture.componentRef.setInput('buttonLabel', 'Upload');
    fixture.detectChanges();

    const emitted: File[] = [];
    fixture.componentRef.instance['fileSelected'].subscribe((file) => emitted.push(file));

    const file = createImageFile('doc.pdf', 'application/pdf');
    const input = fixture.nativeElement.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(input, 'files', { value: [file] });
    input.dispatchEvent(new Event('change'));

    expect(emitted.length).toBe(1);
    expect(emitted[0].name).toBe('doc.pdf');
  });

  it('displays the existing file name when provided and no file is selected', () => {
    const fixture = TestBed.createComponent(FileInputComponent);
    fixture.componentRef.setInput('existingFileName', 'legacy.jpg');
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Current file: legacy.jpg');
  });
});
