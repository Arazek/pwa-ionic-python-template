import { Component, Input, Output, EventEmitter } from '@angular/core';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [NgClass],
  styleUrl: './card.component.scss',
  template: `
    <div
      class="card"
      [ngClass]="{ 'card--clickable': clickable, 'card--flat': flat }"
      (click)="clickable && cardClick.emit()"
    >
      <ng-content />
    </div>
  `,
})
export class CardComponent {
  @Input() clickable = false;
  @Input() flat = false;
  @Output() cardClick = new EventEmitter<void>();
}
