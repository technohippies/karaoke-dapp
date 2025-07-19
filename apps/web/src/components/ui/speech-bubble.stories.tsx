import type { Meta, StoryObj } from "@storybook/react"
import { SpeechBubble } from "./speech-bubble"

const meta = {
  title: "UI/SpeechBubble",
  component: SpeechBubble,
  parameters: {
    layout: "centered",
    backgrounds: {
      default: "gradient",
      values: [
        {
          name: "gradient",
          value: "linear-gradient(135deg, #F4F2F3, #BFC6D0)",
        },
      ],
    },
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "primary", "secondary", "accent"],
    },
    size: {
      control: "select",
      options: ["sm", "default", "lg"],
    },
    tailSide: {
      control: "select",
      options: ["left", "right"],
    },
    tailPosition: {
      control: "select",
      options: ["start", "center", "end"],
    },
    showTail: {
      control: "boolean",
    },
  },
} satisfies Meta<typeof SpeechBubble>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    children: "If you have one bucket that contains 2 gallons and another bucket that contains 7 gallons, how many buckets do you have?",
    variant: "default",
    size: "default",
    tailSide: "left",
    tailPosition: "center",
    showTail: true,
  },
}

export const Primary: Story = {
  args: {
    children: "Welcome to the world of anime speech bubbles! This is a primary variant with vibrant colors.",
    variant: "primary",
    size: "default",
    tailSide: "right",
    tailPosition: "center",
    showTail: true,
  },
}

export const Secondary: Story = {
  args: {
    children: "Sometimes a softer approach is needed. This secondary variant provides a subtle appearance.",
    variant: "secondary",
    size: "default",
    tailSide: "left",
    tailPosition: "start",
    showTail: true,
  },
}

export const Accent: Story = {
  args: {
    children: "Kawaii desu ne! This accent variant brings that anime flair with a pink color scheme.",
    variant: "accent",
    size: "default",
    tailSide: "right",
    tailPosition: "end",
    showTail: true,
  },
}

export const Small: Story = {
  args: {
    children: "A small bubble for quick messages!",
    variant: "default",
    size: "sm",
    tailSide: "left",
    tailPosition: "center",
    showTail: true,
  },
}

export const Large: Story = {
  args: {
    children: "This is a large speech bubble that can contain longer messages. Perfect for when your anime character has a lot to say or needs to explain something important to the audience!",
    variant: "default",
    size: "lg",
    tailSide: "right",
    tailPosition: "center",
    showTail: true,
  },
}

export const NoTail: Story = {
  args: {
    children: "Sometimes you just need a thought bubble without the directional tail.",
    variant: "default",
    size: "default",
    showTail: false,
  },
}

export const MultipleLines: Story = {
  args: {
    children: (
      <>
        <p className="mb-2">This speech bubble can contain multiple paragraphs!</p>
        <p className="mb-2">Perfect for longer dialogues or explanations.</p>
        <p>Each line maintains proper spacing and readability.</p>
      </>
    ),
    variant: "primary",
    size: "default",
    tailSide: "left",
    tailPosition: "center",
    showTail: true,
  },
}

export const LeftTail: Story = {
  args: {
    children: "This bubble has a tail on the left side, pointing to the speaker on the left.",
    variant: "default",
    size: "default",
    tailSide: "left",
    tailPosition: "center",
    showTail: true,
  },
}

export const RightTail: Story = {
  args: {
    children: "This bubble has a tail on the right side, pointing to the speaker on the right.",
    variant: "primary",
    size: "default",
    tailSide: "right",
    tailPosition: "center",
    showTail: true,
  },
}