import type { Meta, StoryObj } from '@storybook/angular';
import { ChipComponent } from './chip.component';

const meta: Meta<ChipComponent> = {
  title: 'Shared/DataDisplay/Chip',
  component: ChipComponent,
  tags: ['autodocs'],
  argTypes: {
    selected: { control: 'boolean' },
    removable: { control: 'boolean' },
    remove: { action: 'remove' },
  },
  render: (args) => ({
    props: args,
    template: `<app-chip [selected]="selected" [removable]="removable" (remove)="remove()">Label</app-chip>`,
  }),
};
export default meta;
type Story = StoryObj<ChipComponent>;

export const Default: Story = { args: { selected: false, removable: false } };
export const Selected: Story = { args: { selected: true, removable: false } };
export const Removable: Story = { args: { selected: false, removable: true } };
export const SelectedAndRemovable: Story = { args: { selected: true, removable: true } };

export const Group: Story = {
  render: () => ({
    template: `
      <div style="display:flex;gap:8px;flex-wrap:wrap;padding:16px">
        <app-chip [selected]="true">Design</app-chip>
        <app-chip>Development</app-chip>
        <app-chip [removable]="true">Marketing</app-chip>
        <app-chip [selected]="true" [removable]="true">Product</app-chip>
      </div>
    `,
  }),
};
