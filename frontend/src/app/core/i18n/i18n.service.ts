import { inject, Injectable, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';

export interface LangOption {
  code: string;
  label: string;
}

@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly transloco = inject(TranslocoService);

  readonly availableLangs: LangOption[] = [
    { code: 'en', label: 'English' },
    { code: 'es', label: 'Español' },
  ];

  readonly activeLang = signal(this.transloco.getActiveLang());

  constructor() {
    const saved = localStorage.getItem('lang') ?? 'en';
    this.transloco.load('en').subscribe();
    this.transloco.load('es').subscribe();
    this.setLang(saved);
  }

  setLang(code: string): void {
    this.transloco.setActiveLang(code);
    this.activeLang.set(code);
    localStorage.setItem('lang', code);
  }
}
