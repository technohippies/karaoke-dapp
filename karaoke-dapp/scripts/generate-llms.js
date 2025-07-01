#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const docsDir = path.join(__dirname, '../docs')
const distDir = path.join(__dirname, '../docs/.vitepress/dist')
const publicDir = path.join(__dirname, '../docs/public')

// Ensure dist directory exists
if (!fs.existsSync(distDir)) {
  console.error('❌ Build directory not found. Run `bun run docs:build` first.')
  process.exit(1)
}

function findMarkdownFiles(dir, baseDir = dir) {
  const files = []
  const items = fs.readdirSync(dir)
  
  for (const item of items) {
    const fullPath = path.join(dir, item)
    const stat = fs.statSync(fullPath)
    
    if (stat.isDirectory() && !item.startsWith('.')) {
      files.push(...findMarkdownFiles(fullPath, baseDir))
    } else if (item.endsWith('.md') && item !== 'README.md') {
      const relativePath = path.relative(baseDir, fullPath)
      files.push({
        path: relativePath,
        fullPath: fullPath
      })
    }
  }
  
  return files
}

function extractFrontmatter(content) {
  const frontmatterMatch = content.match(/^---\s*\n(.*?)\n---\s*\n/s)
  if (!frontmatterMatch) return { frontmatter: {}, content }
  
  const frontmatterText = frontmatterMatch[1]
  const description = frontmatterText.match(/description:\s*(.+)/)?.[1]?.trim().replace(/['"]/g, '')
  
  return {
    frontmatter: { description },
    content: content.replace(frontmatterMatch[0], '')
  }
}

function generateLLMsContent() {
  const files = findMarkdownFiles(docsDir)
  
  let llmsTxt = `# Karaoke Turbo - Decentralized Karaoke Platform

> Documentation for AI/LLM consumption

This documentation covers a decentralized karaoke platform built on Ethereum with Web3 technology.

## Documentation Sections

`

  let llmsFullTxt = `# Karaoke Turbo - Complete Documentation

> Full documentation compiled for AI/LLM consumption

`

  // Process each markdown file
  for (const file of files) {
    try {
      const content = fs.readFileSync(file.fullPath, 'utf-8')
      const { frontmatter, content: mainContent } = extractFrontmatter(content)
      
      // Clean up the path for display
      const cleanPath = file.path.replace(/\\/g, '/').replace(/\.md$/, '')
      const title = cleanPath.split('/').pop().replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      
      // Add to llms.txt (index)
      const description = frontmatter.description ? `: ${frontmatter.description}` : ''
      llmsTxt += `- [${title}](/${cleanPath}.md)${description}\n`
      
      // Add to llms-full.txt (complete content)
      llmsFullTxt += `\n---\n\n# ${title}\n\n`
      if (frontmatter.description) {
        llmsFullTxt += `> ${frontmatter.description}\n\n`
      }
      llmsFullTxt += mainContent
      
      // Copy markdown file to dist
      const distPath = path.join(distDir, file.path)
      const distDirPath = path.dirname(distPath)
      
      if (!fs.existsSync(distDirPath)) {
        fs.mkdirSync(distDirPath, { recursive: true })
      }
      
      fs.writeFileSync(distPath, content, 'utf-8')
      
    } catch (error) {
      console.warn(`⚠️  Failed to process ${file.path}:`, error.message)
    }
  }
  
  // Write the generated files to dist
  fs.writeFileSync(path.join(distDir, 'llms.txt'), llmsTxt, 'utf-8')
  fs.writeFileSync(path.join(distDir, 'llms-full.txt'), llmsFullTxt, 'utf-8')
  
  // Also write to public directory for dev server access
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true })
  }
  fs.writeFileSync(path.join(publicDir, 'llms.txt'), llmsTxt, 'utf-8')
  fs.writeFileSync(path.join(publicDir, 'llms-full.txt'), llmsFullTxt, 'utf-8')
  
  console.log('✅ Generated LLMs files:')
  console.log(`   📋 llms.txt (${files.length} sections)`)
  console.log(`   📖 llms-full.txt (complete documentation)`)
  console.log(`   📁 ${files.length} markdown files copied`)
  console.log(`   🌐 Files available at /docs/llms.txt and /docs/llms-full.txt`)
}

// Run the generator
generateLLMsContent()