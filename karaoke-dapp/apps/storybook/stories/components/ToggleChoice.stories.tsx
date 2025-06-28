import React, { useState } from 'react';
import type { Meta, StoryObj } from 'storybook/internal/types';
import { ToggleChoice, ToggleChoiceGroup } from '../../../web/src/components/ui/toggle-choice';

const meta = {
  title: 'Components/ToggleChoice',
  component: ToggleChoice,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'correct', 'incorrect'],
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg'],
    },
  },
} satisfies Meta<typeof ToggleChoice>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    value: 'option1',
    children: 'The moon represents my heart',
  },
};

export const Checked: Story = {
  args: {
    value: 'option1',
    children: 'The moon represents my heart',
    checked: true,
  },
};

export const Correct: Story = {
  args: {
    value: 'option1',
    children: 'The moon represents my heart',
    variant: 'correct',
    showResult: true,
    isCorrect: true,
  },
};

export const Incorrect: Story = {
  args: {
    value: 'option1',
    children: 'The sun represents my heart',
    variant: 'incorrect',
    checked: true,
    showResult: true,
    isCorrect: false,
  },
};

export const MultipleChoice: Story = {
  render: () => {
    const [value, setValue] = useState<string>('');
    
    return (
      <div className="max-w-md">
        <p className="mb-4 text-lg font-medium">What does "月亮代表我的心" mean?</p>
        <ToggleChoiceGroup value={value} onValueChange={setValue}>
          <ToggleChoice value="1">The moon represents my heart</ToggleChoice>
          <ToggleChoice value="2">The sun represents my soul</ToggleChoice>
          <ToggleChoice value="3">The stars represent my dreams</ToggleChoice>
          <ToggleChoice value="4">The moon represents my love</ToggleChoice>
        </ToggleChoiceGroup>
      </div>
    );
  },
};

export const ShowResults: Story = {
  render: () => {
    const [value, setValue] = useState<string>('2');
    const [showResults, setShowResults] = useState(true);
    
    return (
      <div className="max-w-md space-y-4">
        <p className="text-lg font-medium">What does "月亮代表我的心" mean?</p>
        <ToggleChoiceGroup value={value} onValueChange={setValue}>
          <ToggleChoice 
            value="1" 
            showResult={showResults}
            isCorrect={true}
          >
            The moon represents my heart
          </ToggleChoice>
          <ToggleChoice 
            value="2"
            showResult={showResults}
            isCorrect={false}
          >
            The sun represents my soul
          </ToggleChoice>
          <ToggleChoice 
            value="3"
            showResult={showResults}
            isCorrect={false}
          >
            The stars represent my dreams
          </ToggleChoice>
          <ToggleChoice 
            value="4"
            showResult={showResults}
            isCorrect={false}
          >
            The moon represents my love
          </ToggleChoice>
        </ToggleChoiceGroup>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          {value === '1' ? '✓ Correct!' : '✗ Try again!'}
        </p>
      </div>
    );
  },
};

export const UyghurRTL: Story = {
  render: () => {
    const [value, setValue] = useState<string>('');
    
    return (
      <div className="max-w-md" dir="rtl">
        <p className="mb-4 text-lg font-medium">يۈرەكنىڭ سادىسى نېمە مەنىدە؟</p>
        <ToggleChoiceGroup value={value} onValueChange={setValue}>
          <ToggleChoice value="1">قەلبنىڭ ئاۋازى</ToggleChoice>
          <ToggleChoice value="2">روھنىڭ نىدىسى</ToggleChoice>
          <ToggleChoice value="3">كۆڭۈلنىڭ ئارزۇسى</ToggleChoice>
          <ToggleChoice value="4">يۈرەكنىڭ سۆيگۈسى</ToggleChoice>
        </ToggleChoiceGroup>
      </div>
    );
  },
};