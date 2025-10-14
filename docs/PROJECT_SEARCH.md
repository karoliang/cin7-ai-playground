# Project Search Functionality

## Overview

The CIN7 AI Playground now includes a comprehensive project search system that allows users to quickly find projects and files by searching through project names, descriptions, prompts, and file content.

## Features

### 🔍 Smart Search
- **Multi-field search**: Searches through project names, descriptions, prompts, and file content
- **Weighted scoring**: Project names are weighted highest, followed by descriptions, then file content
- **Text highlighting**: Shows contextual snippets with highlighted search terms
- **Debounced input**: Prevents excessive API calls while typing

### 🎯 Search Types
- **Project search**: Finds projects by name, description, or prompt
- **File search**: Searches within file contents across all projects
- **Combined results**: Shows both projects and files in unified results

### 🚀 Performance Features
- **Debouncing**: 300ms delay prevents excessive searches
- **Cancellable requests**: Aborts ongoing searches when new queries are made
- **Result limiting**: Returns up to 10 most relevant results
- **Error handling**: Graceful error states with user feedback

### 👥 User Experience
- **Loading indicators**: Shows "Searching..." badge during searches
- **Error states**: Displays search errors with visual indicators
- **Keyboard navigation**: Full keyboard support for result selection
- **Clear functionality**: Easy way to clear search and results

## Technical Implementation

### Files Created/Modified

1. **`/src/services/searchService.ts`**
   - Core search functionality
   - Text matching and scoring algorithms
   - Search result formatting

2. **`/src/hooks/useProjectSearch.ts`**
   - React hook for search functionality
   - Debouncing and state management
   - Error handling and loading states

3. **`/src/components/layout/Layout.tsx`**
   - Integration with TopBar search
   - Search result formatting
   - Navigation handling

## Usage

### For Users

1. **Start searching**: Click the search icon in the top bar or press `/` when focused
2. **Type query**: Enter 2+ characters to begin searching
3. **View results**: Search results appear in real-time as you type
4. **Navigate**: Click on any result to go to the project or file
5. **Clear search**: Press Escape or click outside to clear results

### For Developers

```tsx
import { useSearchField } from '@/hooks/useProjectSearch'

const MyComponent = () => {
  const {
    inputValue,
    isFocused,
    results,
    isLoading,
    error,
    handleInputChange,
    handleFocus,
    handleBlur,
    handleSelectResult,
    clearSearch
  } = useSearchField(300) // 300ms debounce

  // Use in your search UI
}
```

## Search Algorithm

### Scoring System
- **Project name match**: ×3 weight
- **Description match**: ×2 weight
- **Prompt match**: ×1.5 weight
- **File content match**: ×0.8 weight

### Text Matching
- Case-insensitive search
- Multiple term support
- Contextual highlighting
- Snippet generation (±30 characters around match)

## API Integration

The search system integrates with the existing project service:

```typescript
// Fetches user projects and searches through them
const projects = await getUserProjects(userId)

// Searches through project data and file content
const results = await searchProjects(query, {
  includeFileContent: true,
  limit: 10,
  userId: user.id
})
```

## Error Handling

- **Network errors**: Graceful degradation with error messages
- **Authentication**: Shows "Sign in to search projects" for unauthenticated users
- **Empty queries**: No searches for queries under 2 characters
- **Abort handling**: Cancels previous requests when new searches are made

## Future Enhancements

### Planned Features
- [ ] Search filters (project type, date range, tags)
- [ ] Search history and recent searches
- [ ] Advanced search operators (AND, OR, NOT)
- [ ] Search analytics and popular searches
- [ ] Keyboard shortcuts (/ for search, Esc to clear)
- [ ] Search result caching
- [ ] Full-text search integration with better indexing

### Performance Optimizations
- [ ] Indexed search for faster queries
- [ ] Search result pagination
- [ ] Background search indexing
- [ ] Search result preprocessing

## Browser Compatibility

The search functionality works in all modern browsers:
- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## Dependencies

- React 18+ (for hooks)
- Shopify Polaris (for UI components)
- Zustand (for state management)
- Modern browser APIs (AbortController, fetch)

## Testing

The search functionality includes comprehensive error handling and should be tested in the following scenarios:

1. **Basic search**: Enter text and verify results
2. **Empty state**: Verify no results for short queries
3. **Error handling**: Test with network issues
4. **Navigation**: Verify clicking results navigates correctly
5. **Performance**: Test with large project collections
6. **Authentication**: Test with signed in/out states