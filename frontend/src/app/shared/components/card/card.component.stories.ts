import type { Meta, StoryObj } from '@storybook/angular';
import { CardComponent } from './card.component';

const meta: Meta<CardComponent> = {
  title: 'Shared/Layout/Card',
  component: CardComponent,
  tags: ['autodocs'],
  argTypes: {
    clickable: { control: 'boolean' },
    flat: { control: 'boolean' },
    cardClick: { action: 'cardClick' },
  },
  render: (args) => ({
    props: args,
    template: `
      <app-card [clickable]="clickable" [flat]="flat" (cardClick)="cardClick()">
        <div style="padding:16px">
          <h3 style="margin:0 0 8px">Card Title</h3>
          <p style="margin:0;color:#666">This is some card content. It can contain anything.</p>
        </div>
      </app-card>
    `,
  }),
};
export default meta;
type Story = StoryObj<CardComponent>;

export const Default: Story = { args: { clickable: false, flat: false } };
export const Clickable: Story = { args: { clickable: true, flat: false } };
export const Flat: Story = { args: { clickable: false, flat: true } };

export const WithRichContent: Story = {
  render: () => ({
    template: `
      <div style="max-width:320px">
        <app-card>
          <div style="padding:16px">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
              <div style="width:40px;height:40px;border-radius:50%;background:#6366f1;display:flex;align-items:center;justify-content:center;color:white;font-weight:600">JD</div>
              <div>
                <div style="font-weight:600">John Doe</div>
                <div style="font-size:12px;color:#888">2 hours ago</div>
              </div>
            </div>
            <p style="margin:0;color:#444">Excited to share the new component library we have been building!</p>
          </div>
        </app-card>
      </div>
    `,
  }),
};
