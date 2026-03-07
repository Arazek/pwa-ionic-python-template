import type { Meta, StoryObj } from '@storybook/angular';
import { EmptyStateComponent } from './empty-state.component';

const meta: Meta<EmptyStateComponent> = {
  title: 'Shared/Feedback/EmptyState',
  component: EmptyStateComponent,
  tags: ['autodocs'],
  argTypes: {
    action: { action: 'action clicked' },
  },
};
export default meta;
type Story = StoryObj<EmptyStateComponent>;

export const Default: Story = {
  args: {
    icon: 'alert-circle-outline',
    title: 'Nothing here yet',
    message: 'Add your first item to get started.',
    actionLabel: '',
  },
};

export const WithAction: Story = {
  args: {
    icon: 'documents-outline',
    title: 'No documents',
    message: 'Upload a document to see it here.',
    actionLabel: 'Upload document',
  },
};

export const SearchEmpty: Story = {
  args: {
    icon: 'search-outline',
    title: 'No results',
    message: 'Try a different search term.',
    actionLabel: '',
  },
};
