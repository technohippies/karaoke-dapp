import type { Meta, StoryObj } from '@storybook/react'
import { KaraokeDisplay } from './KaraokeDisplay'

const meta: Meta<typeof KaraokeDisplay> = {
  title: 'Components/KaraokeDisplay',
  component: KaraokeDisplay,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    autoStart: {
      control: 'boolean',
    },
    lineDelay: {
      control: 'number',
    },
  },
}

export default meta
type Story = StoryObj<typeof KaraokeDisplay>

const royalsLyrics = [
  { text: "I've never seen a diamond in the flesh", duration: 4000 },
  { text: "I cut my teeth on wedding rings in the movies", duration: 4500 },
  { text: "And I'm not proud of my address", duration: 3500 },
  { text: "In a torn-up town, no postcode envy", duration: 4000 },
  { text: "But every song's like gold teeth, Grey Goose, trippin' in the bathroom", duration: 5000 },
  { text: "Bloodstains, ball gowns, trashin' the hotel room", duration: 4500 },
  { text: "We don't care, we're driving Cadillacs in our dreams", duration: 4000 },
  { text: "But everybody's like Cristal, Maybach, diamonds on your timepiece", duration: 5000 },
  { text: "Jet planes, islands, tigers on a gold leash", duration: 4000 },
  { text: "We don't care, we aren't caught up in your love affair", duration: 4500 },
  { text: "And we'll never be royals", duration: 3000 },
  { text: "It don't run in our blood", duration: 3500 },
  { text: "That kind of luxe just ain't for us", duration: 4000 },
  { text: "We crave a different kind of buzz", duration: 3500 },
  { text: "Let me be your ruler", duration: 3000 },
  { text: "You can call me Queen Bee", duration: 3500 },
  { text: "And baby I'll rule, I'll rule, I'll rule, I'll rule", duration: 4000 },
  { text: "Let me live that fantasy", duration: 3500 },
  { text: "My friends and I we've cracked the code", duration: 4000 },
  { text: "We count our dollars on the train to the party", duration: 4500 },
  { text: "And everyone who knows us knows that we're fine with this", duration: 5000 },
  { text: "We didn't come from money", duration: 3500 },
  { text: "But every song's like gold teeth, Grey Goose, trippin' in the bathroom", duration: 5000 },
  { text: "Bloodstains, ball gowns, trashin' the hotel room", duration: 4500 },
  { text: "We don't care, we're driving Cadillacs in our dreams", duration: 4000 },
  { text: "But everybody's like Cristal, Maybach, diamonds on your timepiece", duration: 5000 },
  { text: "Jet planes, islands, tigers on a gold leash", duration: 4000 },
  { text: "We don't care, we aren't caught up in your love affair", duration: 4500 },
  { text: "And we'll never be royals", duration: 3000 },
  { text: "It don't run in our blood", duration: 3500 },
  { text: "That kind of luxe just ain't for us", duration: 4000 },
  { text: "We crave a different kind of buzz", duration: 3500 },
  { text: "Let me be your ruler", duration: 3000 },
  { text: "You can call me Queen Bee", duration: 3500 },
  { text: "And baby I'll rule, I'll rule, I'll rule, I'll rule", duration: 4000 },
  { text: "Let me live that fantasy", duration: 3500 },
  { text: "We're bigger than we ever dreamed", duration: 4000 },
  { text: "And I'm in love with being queen", duration: 4000 },
  { text: "Life is great without a care", duration: 3500 },
  { text: "We aren't caught up in your love affair", duration: 4500 },
  { text: "And we'll never be royals", duration: 3000 },
  { text: "It don't run in our blood", duration: 3500 },
  { text: "That kind of luxe just ain't for us", duration: 4000 },
  { text: "We crave a different kind of buzz", duration: 3500 },
  { text: "Let me be your ruler", duration: 3000 },
  { text: "You can call me Queen Bee", duration: 3500 },
  { text: "And baby I'll rule, I'll rule, I'll rule, I'll rule", duration: 4000 },
  { text: "Let me live that fantasy", duration: 4000 },
]

const shortLyrics = [
  { text: "Twinkle, twinkle, little star", duration: 3000 },
  { text: "How I wonder what you are", duration: 3000 },
  { text: "Up above the world so high", duration: 3000 },
  { text: "Like a diamond in the sky", duration: 3000 },
]

export const RoyalsDemo: Story = {
  args: {
    lyrics: royalsLyrics,
    autoStart: true,
    lineDelay: 4000,
    onClose: () => console.log('Karaoke closed'),
  },
}

export const ShortSong: Story = {
  args: {
    lyrics: shortLyrics,
    autoStart: true,
    lineDelay: 3000,
    onClose: () => console.log('Short song closed'),
  },
}

export const ManualControl: Story = {
  args: {
    lyrics: shortLyrics,
    autoStart: false,
    lineDelay: 5000,
    onClose: () => console.log('Manual karaoke closed'),
  },
}

export const FastPaced: Story = {
  args: {
    lyrics: [
      { text: "Fast song line one", duration: 1500 },
      { text: "Quick transition here", duration: 1500 },
      { text: "Rapid fire lyrics", duration: 1500 },
      { text: "Keep up the pace", duration: 1500 },
      { text: "Almost done now", duration: 1500 },
      { text: "Final line!", duration: 2000 },
    ],
    autoStart: true,
    lineDelay: 1500,
    onClose: () => console.log('Fast karaoke closed'),
  },
}

export const SlowBallad: Story = {
  args: {
    lyrics: [
      { text: "Slow and emotional line", duration: 6000 },
      { text: "Take your time with this one", duration: 7000 },
      { text: "Feel every word deeply", duration: 6500 },
      { text: "The finale approaches", duration: 6000 },
      { text: "End on a high note", duration: 8000 },
    ],
    autoStart: true,
    lineDelay: 6000,
    onClose: () => console.log('Slow ballad closed'),
  },
}

export const VeryShort: Story = {
  args: {
    lyrics: [
      { text: "Happy birthday to you", duration: 3000 },
      { text: "Happy birthday to you", duration: 3000 },
      { text: "Happy birthday dear friend", duration: 4000 },
      { text: "Happy birthday to you!", duration: 3000 },
    ],
    autoStart: true,
    lineDelay: 3000,
    onClose: () => console.log('Birthday song closed'),
  },
}