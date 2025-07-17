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

// "Faith Base" by Scarlett X - Original Christian Rap
const faithBaseLyrics = [
  { text: "Yo, I'm building on a foundation that's solid as rock", translation: "我正在建立一个坚如磐石的基础", duration: 4000 },
  { text: "Got my faith base strong, yeah I'm ready to walk", translation: "我的信仰根基稳固，我准备好前行", duration: 4500 },
  { text: "Through the valleys and peaks, I ain't moving alone", translation: "穿越山谷和高峰，我并非独自前行", duration: 3500 },
  { text: "Got the Spirit inside, made my heart His home", duration: 4000 },
  { text: "They be chasing the clout, fame, money and power", duration: 5000 },
  { text: "But I'm planted like trees by the living water", duration: 4500 },
  { text: "When the storms come through, I ain't shook, I ain't fazed", duration: 4000 },
  { text: "'Cause my faith base strong, giving glory and praise", duration: 5000 },
  { text: "Faith base, faith base, we building it up", duration: 4000 },
  { text: "Grace flows like rivers when times getting tough", duration: 4500 },
  { text: "Faith base, faith base, foundation secure", duration: 3000 },
  { text: "His love everlasting, His promises sure", duration: 3500 },
  { text: "Started from the bottom but not where I'm at", duration: 4000 },
  { text: "Got saved by His mercy, now I'm walking the path", duration: 3500 },
  { text: "Every morning new mercies, yeah that's how I rise", duration: 3000 },
  { text: "Got my eyes on the Kingdom, that eternal prize", duration: 3500 },
  { text: "I don't flex with the jewels or designer drip", duration: 4000 },
  { text: "But I'm rich in the Spirit, got that holy equip", duration: 3500 },
  { text: "Armor of God on, yeah I'm dressed for the battle", duration: 4000 },
  { text: "Devil try to shake me but my faith never rattled", duration: 4500 },
  { text: "Prayer is my weapon, Word is my sword", duration: 5000 },
  { text: "Standing on the promises, trusting in the Lord", duration: 3500 },
  { text: "They can hate all they want, I'ma love them still", duration: 5000 },
  { text: "'Cause my faith base built on Calvary's hill", duration: 4500 },
  { text: "Faith base, faith base, we building it up", duration: 4000 },
  { text: "Grace flows like rivers when times getting tough", duration: 5000 },
  { text: "Faith base, faith base, foundation secure", duration: 4000 },
  { text: "His love everlasting, His promises sure", duration: 4500 },
  { text: "Bridge: When I'm weak, He's strong", duration: 3000 },
  { text: "When I'm lost, He leads me home", duration: 3500 },
  { text: "Never alone, never forsaken", duration: 4000 },
  { text: "My faith unshaken, my soul awakened", duration: 3500 },
  { text: "From the East to West, let 'em know what we about", duration: 3000 },
  { text: "Living water flowing, got that joy, gotta shout", duration: 3500 },
  { text: "Not ashamed of the Gospel, it's the power to save", duration: 4000 },
  { text: "From the cradle to grave, by His blood I'm brave", duration: 3500 },
  { text: "This ain't just Sunday service, this my everyday", duration: 4000 },
  { text: "Walking in the light, letting love lead the way", duration: 4000 },
  { text: "Faith base solid, can't nobody move it", duration: 3500 },
  { text: "God said it, I believe it, watch me go and prove it", duration: 4500 },
  { text: "Faith base, faith base, we building it up", duration: 3000 },
  { text: "Grace flows like rivers when times getting tough", duration: 3500 },
  { text: "Faith base, faith base, foundation secure", duration: 4000 },
  { text: "His love everlasting, His promises sure", duration: 3500 },
  { text: "Yeah, Scarlett X on the track", duration: 3000 },
  { text: "Faith base strong, ain't no turning back", duration: 3500 },
  { text: "Kingdom minded, heaven bound, that's facts", duration: 4000 },
  { text: "Faith base solid, and that's that", duration: 4000 },
]

const shortLyrics = [
  { text: "Twinkle, twinkle, little star", duration: 3000 },
  { text: "How I wonder what you are", duration: 3000 },
  { text: "Up above the world so high", duration: 3000 },
  { text: "Like a diamond in the sky", duration: 3000 },
]

export const FaithBase: Story = {
  args: {
    lyrics: faithBaseLyrics,
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