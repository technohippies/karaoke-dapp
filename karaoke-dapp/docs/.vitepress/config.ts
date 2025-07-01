export default {
  title: 'Karaoke Turbo',
  description: 'Decentralized Karaoke Platform Documentation',
  base: '/docs/',
  ignoreDeadLinks: true,
  
  vue: {
    template: {
      compilerOptions: {
        isCustomElement: (tag) => tag === 'mermaid'
      }
    }
  },
  
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Architecture', link: '/architecture/' },
      { text: 'Packages', link: '/packages/' },
      { text: 'API', link: '/api/' },
      { text: 'Guides', link: '/guides/' }
    ],

    sidebar: {
      '/architecture/': [
        {
          text: 'Architecture',
          items: [
            { text: 'Overview', link: '/architecture/' },
            { text: 'State Machines', link: '/architecture/state-machines' },
            { text: 'Data Flow', link: '/architecture/data-flow' },
            { text: 'Security Model', link: '/architecture/security-model' }
          ]
        }
      ],
      
      '/packages/': [
        {
          text: 'Packages',
          items: [
            { text: 'Overview', link: '/packages/' },
            { text: 'UI Components', link: '/packages/ui' },
            { text: 'Services', link: '/packages/services' },
            { text: 'Database', link: '/packages/db' },
            { text: 'Contracts', link: '/packages/contracts' },
            { text: 'Lit Actions', link: '/packages/lit-actions' },
            { text: 'Utils', link: '/packages/utils' }
          ]
        }
      ],

      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'Overview', link: '/api/' },
            { text: 'Audio Services', link: '/api/audio-services' },
            { text: 'Karaoke Services', link: '/api/karaoke-services' },
            { text: 'Encryption', link: '/api/encryption' },
            { text: 'Database', link: '/api/database' }
          ]
        }
      ],

      '/contracts/': [
        {
          text: 'Smart Contracts',
          items: [
            { text: 'Overview', link: '/contracts/' },
            { text: 'KaraokeStore', link: '/contracts/karaoke-store' },
            { text: 'Deployment', link: '/contracts/deployment' }
          ]
        }
      ],

      '/guides/': [
        {
          text: 'Guides',
          items: [
            { text: 'Getting Started', link: '/guides/' },
            { text: 'Development Setup', link: '/guides/development-setup' },
            { text: 'Deployment', link: '/guides/deployment' },
            { text: 'Testing', link: '/guides/testing' }
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/your-repo/karaoke-turbo' }
    ],

    search: {
      provider: 'local'
    }
  },

  markdown: {
    config: (md) => {
      // We'll add the LLMs plugin via a different approach
    }
  }
}