import type { Meta, StoryObj } from '@storybook/react';
import { Spreadsheet } from '../src/Spreadsheet';

const meta: Meta<typeof Spreadsheet> = {
  title: 'Components/Spreadsheet',
  component: Spreadsheet,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Spreadsheet>;

export const EmptyShell: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story:
          'The Phase 0 scaffold. Renders a styled root container with the empty-state label. Real grid lands in subsequent phases.',
      },
    },
  },
  render: (args) => (
    <div style={{ width: 600, height: 400 }}>
      <Spreadsheet {...args} />
    </div>
  ),
};
