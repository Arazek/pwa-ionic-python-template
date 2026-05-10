import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { I18nService } from './i18n.service';

describe('I18nService', () => {
  let service: I18nService;
  let transloco: jasmine.SpyObj<TranslocoService>;

  beforeEach(() => {
    localStorage.clear();

    transloco = jasmine.createSpyObj('TranslocoService', [
      'setActiveLang', 'getActiveLang', 'load',
    ]);
    transloco.getActiveLang.and.returnValue('en');
    transloco.load.and.returnValue({ subscribe: () => ({}) } as any);

    TestBed.configureTestingModule({
      providers: [
        I18nService,
        { provide: TranslocoService, useValue: transloco },
      ],
    });

    service = TestBed.inject(I18nService);
  });

  afterEach(() => localStorage.clear());

  it('defaults to "en" when localStorage is empty', () => {
    expect(transloco.setActiveLang).toHaveBeenCalledWith('en');
    expect(service.activeLang()).toBe('en');
  });

  it('restores saved language from localStorage', () => {
    localStorage.setItem('lang', 'es');
    transloco.setActiveLang.calls.reset();

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        I18nService,
        { provide: TranslocoService, useValue: transloco },
      ],
    });
    const fresh = TestBed.inject(I18nService);

    expect(transloco.setActiveLang).toHaveBeenCalledWith('es');
    expect(fresh.activeLang()).toBe('es');
  });

  it('setLang updates activeLang signal and persists to localStorage', () => {
    service.setLang('es');
    expect(transloco.setActiveLang).toHaveBeenCalledWith('es');
    expect(service.activeLang()).toBe('es');
    expect(localStorage.getItem('lang')).toBe('es');
  });

  it('exposes availableLangs with en and es entries', () => {
    expect(service.availableLangs.map((l) => l.code)).toEqual(['en', 'es']);
  });
});
