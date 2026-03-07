import type { Meta, StoryObj } from '@storybook/angular';
import { SectionComponent } from './section.component';

const meta: Meta<SectionComponent> = {
  title: 'Shared/Layout/Section',
  component: SectionComponent,
  tags: ['autodocs'],
  argTypes: {
    seeAll: { action: 'seeAll' },
  },
  render: (args) => ({
    props: args,
    template: `
      <app-section [title]="title" [seeAllLabel]="seeAllLabel" (seeAll)="seeAll()">
        <div style="padding:8px 0;color:#666">Section content goes here.</div>
      </app-section>
    `,
  }),
};
export default meta;
type Story = StoryObj<SectionComponent>;

export const Default: Story = { args: { title: 'Recent Activity', seeAllLabel: '' } };
export const WithSeeAll: Story = { args: { title: 'Recent Activity', seeAllLabel: 'See all' } };
export const NoTitle: Story = { args: { title: '', seeAllLabel: '' } };

export const WithListContent: Story = {
  render: () => ({
    template: `
      <div style="max-width:360px;padding:16px">
        <app-section title="Team Members" seeAllLabel="View all">
          <div style="display:flex;flex-direction:column;gap:8px">
            <div style="padding:8px;background:#f5f5f5;border-radius:8px">Alice — Designer</div>
            <div style="padding:8px;background:#f5f5f5;border-radius:8px">Bob — Engineer</div>
            <div style="padding:8px;background:#f5f5f5;border-radius:8px">Charlie — PM</div>
          </div>
        </app-section>
      </div>
    `,
  }),
};
