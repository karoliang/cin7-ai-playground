import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { searchProjects, getSearchSuggestions, SearchResult, SearchOptions } from '@/services/searchService'

interface UseProjectSearchState {
  query: string
  results: SearchResult[]
  suggestions: string[]
  isLoading: boolean
  error: string | null
  hasSearched: boolean
}

interface UseProjectSearchActions {
  search: (query: string, options?: SearchOptions) => Promise<void>
  clearSearch: () => void
  selectResult: (result: SearchResult) => void
  getSuggestions: (query: string) => Promise<void>
  clearError: () => void
}

export function useProjectSearch(
  debounceMs: number = 300
): UseProjectSearchState & UseProjectSearchActions {
  const { user, isAuthenticated } = useAuthStore()

  const [state, setState] = useState<UseProjectSearchState>({
    query: '',
    results: [],
    suggestions: [],
    isLoading: false,
    error: null,
    hasSearched: false
  })

  const debounceTimerRef = useRef<NodeJS.Timeout>()
  const abortControllerRef = useRef<AbortController>()

  // Cleanup function
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  const search = useCallback(async (query: string, options: SearchOptions = {}) => {
    // Cancel any ongoing search
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    setState(prev => ({
      ...prev,
      query,
      isLoading: true,
      error: null
    }))

    // Don't search for empty or very short queries
    if (!query || query.trim().length < 2) {
      setState(prev => ({
        ...prev,
        results: [],
        isLoading: false,
        hasSearched: false
      }))
      return
    }

    // For unauthenticated users, return empty results
    if (!isAuthenticated || !user?.id) {
      setState(prev => ({
        ...prev,
        results: [],
        isLoading: false,
        hasSearched: true,
        error: 'Please sign in to search projects'
      }))
      return
    }

    try {
      abortControllerRef.current = new AbortController()

      const results = await searchProjects(query, {
        ...options,
        userId: user.id
      })

      // Check if the search was cancelled
      if (abortControllerRef.current?.signal.aborted) {
        return
      }

      setState(prev => ({
        ...prev,
        results,
        isLoading: false,
        hasSearched: true,
        error: null
      }))

    } catch (error) {
      // Don't treat aborted requests as errors
      if (error instanceof Error && error.name === 'AbortError') {
        return
      }

      console.error('Search error:', error)
      setState(prev => ({
        ...prev,
        results: [],
        isLoading: false,
        error: error instanceof Error ? error.message : 'Search failed'
      }))
    }
  }, [isAuthenticated, user?.id])

  const debouncedSearch = useCallback((query: string, options?: SearchOptions): Promise<void> => {
    return new Promise((resolve) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }

      debounceTimerRef.current = setTimeout(() => {
        search(query, options).finally(resolve)
      }, debounceMs)
    })
  }, [search, debounceMs])

  const clearSearch = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    setState({
      query: '',
      results: [],
      suggestions: [],
      isLoading: false,
      error: null,
      hasSearched: false
    })
  }, [])

  const selectResult = useCallback((result: SearchResult) => {
    // This can be handled by the component that uses the hook
    // The component can navigate to the selected project or file
    return result
  }, [])

  const getSuggestions = useCallback(async (query: string) => {
    if (!query || query.length < 2 || !isAuthenticated || !user?.id) {
      setState(prev => ({ ...prev, suggestions: [] }))
      return
    }

    try {
      const suggestions = await getSearchSuggestions(query, user.id)
      setState(prev => ({ ...prev, suggestions }))
    } catch (error) {
      console.error('Get suggestions error:', error)
      setState(prev => ({ ...prev, suggestions: [] }))
    }
  }, [isAuthenticated, user?.id])

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  // Return both state and actions, with a debounced search function
  return {
    ...state,
    search: debouncedSearch,
    clearSearch,
    selectResult,
    getSuggestions,
    clearError
  }
}

/**
 * Hook for handling search field interactions with debouncing
 */
export function useSearchField(debounceMs: number = 300) {
  const [inputValue, setInputValue] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const {
    search,
    clearSearch,
    selectResult,
    getSuggestions,
    ...searchState
  } = useProjectSearch(debounceMs)

  // Handle input change with debouncing
  const handleInputChange = useCallback((value: string) => {
    setInputValue(value)

    if (value.trim().length >= 2) {
      search(value)
      getSuggestions(value)
    } else if (value.trim().length === 0) {
      clearSearch()
    }
  }, [search, getSuggestions, clearSearch])

  // Handle focus
  const handleFocus = useCallback(() => {
    setIsFocused(true)
    // Show suggestions when focused if there's a query
    if (inputValue.trim().length >= 2) {
      getSuggestions(inputValue)
    }
  }, [inputValue, getSuggestions])

  // Handle blur
  const handleBlur = useCallback(() => {
    // Delay hiding to allow for result selection
    setTimeout(() => {
      setIsFocused(false)
    }, 200)
  }, [])

  // Handle result selection
  const handleSelectResult = useCallback((result: SearchResult) => {
    selectResult(result)
    setInputValue('') // Clear input after selection
    setIsFocused(false)
    // Don't clear search immediately, let the navigation happen first
    setTimeout(() => clearSearch(), 100)
  }, [selectResult, clearSearch])

  // Handle suggestion selection
  const handleSelectSuggestion = useCallback((suggestion: string) => {
    setInputValue(suggestion)
    search(suggestion)
  }, [search])

  return {
    // Input state
    inputValue,
    isFocused,

    // Search state
    ...searchState,

    // Actions
    handleInputChange,
    handleFocus,
    handleBlur,
    handleSelectResult,
    handleSelectSuggestion,
    clearSearch: () => {
      clearSearch()
      setInputValue('')
      setIsFocused(false)
    }
  }
}