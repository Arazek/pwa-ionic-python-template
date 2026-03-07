import type { Meta, StoryObj } from '@storybook/angular';
import { ChipListComponent } from './chip-list.component';
import { ChipComponent } from './chip.component';

const meta: Meta<ChipListComponent> = {
  title: 'Shared/DataDisplay/ChipList',
  component: ChipListComponent,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<ChipListComponent>;

export const Default: Story = {
  render: () => ({
    imports: [ChipComponent],
    template: `
      <app-chip-list>
        <app-chip [selected]="true">Design</app-chip>
        <app-chip>Development</app-chip>
        <app-chip [removable]="true">Marketing</app-chip>
        <app-chip>Product</app-chip>
        <app-chip [selected]="true">Strategy</app-chip>
      </app-chip-list>
    `,
  }),
};

export const AllSelected: Story = {
  render: () => ({
    imports: [ChipComponent],
    template: `
      <app-chip-list>
        <app-chip [selected]="true">Angular</app-chip>
        <app-chip [selected]="true">Ionic</app-chip>
        <app-chip [selected]="true">TypeScript</app-chip>
      </app-chip-list>
    `,
  }),
};
