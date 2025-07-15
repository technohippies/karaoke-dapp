import { useState, useCallback, useRef } from 'react'
import { PostUnlockContentLoader, type LoadedContent } from '../services/PostUnlockContentLoader'
import type { Song } from '../services/tableland'

interface PostUnlockContentState {
  isLoading: boolean
  content: LoadedContent | null
  error: string | null
}

export function usePostUnlockContent() {
  const [state, setState] = useState<PostUnlockContentState>({
    isLoading: false,
    content: null,
    error: null
  })

  const loaderRef = useRef<PostUnlockContentLoader>(new PostUnlockContentLoader())

  const loadContent = useCallback(async (song: Song, userAddress: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const content = await loaderRef.current.loadContent(song, userAddress)
      console.log('📦 Content loaded by hook:', {
        hasContent: !!content,
        hasMidiData: !!content?.midiData,
        cached: content?.cached
      })
      setState({ isLoading: false, content, error: null })
      return content
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load content'
      setState({ isLoading: false, content: null, error: errorMessage })
      return null
    }
  }, [])

  const checkCacheOnly = useCallback(async (song: Song, userAddress: string) => {
    const content = await loaderRef.current.checkCacheOnly(song, userAddress)
    if (content) {
      console.log('📦 Cache-only check found content, updating state')
      setState({ isLoading: false, content, error: null })
      return content
    }
    return null
  }, [])

  const clearCache = useCallback(() => {
    loaderRef.current.clearCache()
  }, [])

  return {
    ...state,
    loadContent,
    checkCacheOnly,
    clearCache
  }
}