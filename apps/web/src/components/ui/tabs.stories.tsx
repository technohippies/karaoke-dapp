import type { Meta, StoryObj } from '@storybook/react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs'
import { Button } from './button'

const meta: Meta<typeof Tabs> = {
  title: 'UI/Atoms/Tabs',
  component: Tabs,
  parameters: {
    layout: 'padded',
  },
}

export default meta
type Story = StoryObj<typeof Tabs>

export const Basic: Story = {
  render: () => (
    <div className="max-w-lg">
      <Tabs defaultValue="lyrics">
        <TabsList>
          <TabsTrigger value="lyrics">Lyrics</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
        </TabsList>
        <TabsContent value="lyrics">
          <div className="text-white">
            <h3 className="text-lg font-semibold mb-4">Song Lyrics</h3>
            <p className="text-neutral-300">I've never seen a diamond in the flesh...</p>
          </div>
        </TabsContent>
        <TabsContent value="leaderboard">
          <div className="text-white">
            <h3 className="text-lg font-semibold mb-4">Top Performers</h3>
            <p className="text-neutral-300">Rankings will appear here...</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  ),
}

export const ThreeTabs: Story = {
  render: () => (
    <div className="max-w-lg">
      <Tabs defaultValue="account">
        <TabsList>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="help">Help</TabsTrigger>
        </TabsList>
        <TabsContent value="account">
          <div className="text-white p-4 bg-neutral-800 rounded-lg">
            <h3 className="font-semibold mb-2">Account Settings</h3>
            <p className="text-neutral-300 text-sm">Manage your account here.</p>
          </div>
        </TabsContent>
        <TabsContent value="settings">
          <div className="text-white p-4 bg-neutral-800 rounded-lg">
            <h3 className="font-semibold mb-2">App Settings</h3>
            <p className="text-neutral-300 text-sm">Configure your preferences.</p>
          </div>
        </TabsContent>
        <TabsContent value="help">
          <div className="text-white p-4 bg-neutral-800 rounded-lg">
            <h3 className="font-semibold mb-2">Help & Support</h3>
            <p className="text-neutral-300 text-sm">Get help with the app.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  ),
}

export const WithButtons: Story = {
  render: () => (
    <div className="max-w-lg">
      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>
        <TabsContent value="profile">
          <div className="text-white p-4 bg-neutral-800 rounded-lg space-y-4">
            <h3 className="font-semibold">Profile Information</h3>
            <p className="text-neutral-300 text-sm">Update your profile details below.</p>
            <Button variant="outline">Edit Profile</Button>
          </div>
        </TabsContent>
        <TabsContent value="billing">
          <div className="text-white p-4 bg-neutral-800 rounded-lg space-y-4">
            <h3 className="font-semibold">Billing Details</h3>
            <p className="text-neutral-300 text-sm">Manage your subscription and payments.</p>
            <Button>Update Payment</Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  ),
}

export const FullWidth: Story = {
  render: () => (
    <Tabs defaultValue="overview">
      <TabsList className="w-full">
        <TabsTrigger value="overview" className="flex-1">Overview</TabsTrigger>
        <TabsTrigger value="analytics" className="flex-1">Analytics</TabsTrigger>
        <TabsTrigger value="reports" className="flex-1">Reports</TabsTrigger>
      </TabsList>
      <TabsContent value="overview">
        <div className="text-white p-6 bg-neutral-800 rounded-lg">
          <h3 className="text-xl font-semibold mb-4">Overview Dashboard</h3>
          <p className="text-neutral-300">Welcome to your dashboard overview.</p>
        </div>
      </TabsContent>
      <TabsContent value="analytics">
        <div className="text-white p-6 bg-neutral-800 rounded-lg">
          <h3 className="text-xl font-semibold mb-4">Analytics</h3>
          <p className="text-neutral-300">View your analytics data here.</p>
        </div>
      </TabsContent>
      <TabsContent value="reports">
        <div className="text-white p-6 bg-neutral-800 rounded-lg">
          <h3 className="text-xl font-semibold mb-4">Reports</h3>
          <p className="text-neutral-300">Generate and view reports.</p>
        </div>
      </TabsContent>
    </Tabs>
  ),
}