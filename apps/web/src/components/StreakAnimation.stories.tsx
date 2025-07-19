import type { Meta, StoryObj } from '@storybook/react'
import { StreakAnimation } from './StreakAnimation'
import { useState } from 'react'
import { Button } from './ui/button'

const meta = {
  title: 'Components/StreakAnimation',
  component: StreakAnimation,
  parameters: {
    layout: 'centered',
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#171717' },
      ],
    },
  },
  tags: ['autodocs'],
  argTypes: {
    initialStreak: {
      control: { type: 'number', min: 0, max: 100 },
      description: 'The starting streak number'
    },
    targetStreak: {
      control: { type: 'number', min: 0, max: 100 },
      description: 'The ending streak number (should be > initial for animation)'
    },
    autoAnimate: {
      control: 'boolean',
      description: 'Whether to automatically start the animation'
    },
    animationDelay: {
      control: { type: 'number', min: 0, max: 5000, step: 100 },
      description: 'Delay before animation starts (ms)'
    }
  }
} satisfies Meta<typeof StreakAnimation>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    initialStreak: 5,
    targetStreak: 6,
    autoAnimate: true,
    animationDelay: 1000
  }
}

export const FirstStreak: Story = {
  args: {
    initialStreak: 0,
    targetStreak: 1,
    autoAnimate: true,
    animationDelay: 1000
  }
}

export const NoAnimation: Story = {
  args: {
    initialStreak: 7,
    targetStreak: 7,
    autoAnimate: true,
    animationDelay: 1000
  }
}

export const LargeStreak: Story = {
  args: {
    initialStreak: 99,
    targetStreak: 100,
    autoAnimate: true,
    animationDelay: 1000
  }
}

export const ManualTrigger: Story = {
  args: {
    initialStreak: 3,
    targetStreak: 4,
    autoAnimate: true,
    animationDelay: 500
  },
  render: () => {
    const [key, setKey] = useState(0)
    const [currentStreak, setCurrentStreak] = useState(3)
    
    const handleIncrease = () => {
      setKey(prev => prev + 1)
      setTimeout(() => {
        setCurrentStreak(prev => prev + 1)
      }, 3000)
    }
    
    return (
      <div className="flex flex-col items-center gap-8">
        <StreakAnimation
          key={key}
          initialStreak={currentStreak}
          targetStreak={currentStreak + 1}
          autoAnimate={true}
          animationDelay={500}
        />
        <Button onClick={handleIncrease}>
          Increase Streak
        </Button>
      </div>
    )
  }
}

export const DelayedAnimation: Story = {
  args: {
    initialStreak: 10,
    targetStreak: 11,
    autoAnimate: true,
    animationDelay: 3000
  }
}

export const MultipleIncreases: Story = {
  args: {
    initialStreak: 0,
    targetStreak: 1,
    autoAnimate: true,
    animationDelay: 1000
  },
  render: () => {
    const [streaks] = useState([
      { initial: 0, target: 1 },
      { initial: 5, target: 6 },
      { initial: 29, target: 30 },
      { initial: 99, target: 100 }
    ])
    
    return (
      <div className="grid grid-cols-2 gap-8">
        {streaks.map((streak, i) => (
          <div key={i} className="p-8 bg-neutral-800 rounded-lg">
            <StreakAnimation
              initialStreak={streak.initial}
              targetStreak={streak.target}
              autoAnimate={true}
              animationDelay={1000 + (i * 500)}
            />
          </div>
        ))}
      </div>
    )
  }
}