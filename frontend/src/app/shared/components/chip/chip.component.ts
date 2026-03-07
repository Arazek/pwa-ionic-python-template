import { Component, Input, Output, EventEmitter } from '@angular/core';
import { NgClass } from '@angular/common';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline } from 'ionicons/icons';

@Component({
  selector: 'app-chip',
  standalone: true,
  imports: [NgClass, IonIcon],
  styleUrl: './chip.component.scss',
  template: `
    <span class="chip" [ngClass]="{ 'chip--selected': selected, 'chip--removable': removable }">
      <ng-content />
      @if (removable) {
        <ion-icon
          class="chip__remove"
          name="close-outline"
          (click)="remove.emit(); $event.stopPropagation()"
        />
      }
    </span>
  `,
})
export class ChipComponent {
  @Input() selected = false;
  @Input() removable = false;
  @Output() remove = new EventEmitter<void>();

  constructor() {
    addIcons({ closeOutline });
  }
}
