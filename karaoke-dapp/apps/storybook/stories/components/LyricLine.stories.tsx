import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { LyricLine } from '@karaoke-dapp/ui';

const meta = {
  title: 'Components/LyricLine',
  component: LyricLine,
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      default: 'dark',
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof LyricLine>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    text: "Lorem ipsum dolor sit amet",
  },
};

export const Hovered: Story = {
  args: {
    text: "Consectetur adipiscing elit",
    className: "bg-neutral-600",
  },
};

export const LongSongList: Story = {
  render: () => {
    const lyrics = [
      "Lorem ipsum dolor sit amet",
      "Consectetur adipiscing elit sed do",
      "Eiusmod tempor incididunt ut labore",
      "Et dolore magna aliqua ut enim",
      "Ad minim veniam quis nostrud",
      "Exercitation ullamco laboris nisi",
      "Ut aliquip ex ea commodo consequat",
      "Duis aute irure dolor in reprehenderit",
      "In voluptate velit esse cillum dolore",
      "Eu fugiat nulla pariatur excepteur",
      "Sint occaecat cupidatat non proident",
      "Sunt in culpa qui officia deserunt",
      "Mollit anim id est laborum",
      "Sed ut perspiciatis unde omnis",
      "Iste natus error sit voluptatem",
      "Accusantium doloremque laudantium",
      "Totam rem aperiam eaque ipsa",
      "Quae ab illo inventore veritatis",
      "Et quasi architecto beatae vitae",
      "Dicta sunt explicabo nemo enim",
      "Ipsam voluptatem quia voluptas sit",
      "Aspernatur aut odit aut fugit",
      "Sed quia consequuntur magni dolores",
      "Eos qui ratione voluptatem sequi",
      "Nesciunt neque porro quisquam est",
      "Qui dolorem ipsum quia dolor sit",
      "Amet consectetur adipisci velit",
      "Sed quia non numquam eius modi",
      "Tempora incidunt ut labore et dolore",
      "Magnam aliquam quaerat voluptatem",
      "Ut enim ad minima veniam quis",
      "Nostrum exercitationem ullam corporis",
      "Suscipit laboriosam nisi ut aliquid",
      "Ex ea commodi consequatur quis autem",
      "Vel eum iure reprehenderit qui in ea",
      "Voluptate velit esse quam nihil",
      "Molestiae consequatur vel illum qui",
      "Dolorem eum fugiat quo voluptas",
      "Nulla pariatur excepteur sint",
      "At vero eos et accusamus et iusto",
      "Odio dignissimos ducimus qui blanditiis",
      "Praesentium voluptatum deleniti atque",
      "Corrupti quos dolores et quas",
      "Molestias excepturi sint occaecati",
      "Cupiditate non provident similique",
      "Sunt in culpa qui officia deserunt",
      "Mollitia animi id est laborum et",
      "Dolorum fuga et harum quidem rerum",
      "Facilis est et expedita distinctio",
      "Nam libero tempore cum soluta nobis",
    ];

    return (
      <div className="p-8">
        <div className="max-w-2xl mx-auto">
          <div className="space-y-0.5">
            {lyrics.map((line, index) => (
              <LyricLine 
                key={index} 
                text={line}
                active={index === 15}
              />
            ))}
          </div>
        </div>
      </div>
    );
  },
};