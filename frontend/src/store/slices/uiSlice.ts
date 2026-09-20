import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { v4 as uuidv4 } from 'uuid'

export interface RecentQuery {
  id: string        // uuid v4
  text: string      // query text
  timestamp: string // ISO 8601 string
}

export interface UIState {
  chatInput: string
  suggestions: string[]        // currently active chip set (persisted)
  recentQueries: RecentQuery[] // capped at 20, prepend-on-add
}

const initialState: UIState = {
  chatInput: '',
  suggestions: [],
  recentQueries: [],
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setChatInput(state, action: PayloadAction<string>) {
      state.chatInput = action.payload
    },
    addRecentQuery(state, action: PayloadAction<{ text: string }>) {
      const newQuery: RecentQuery = {
        id: uuidv4(),
        text: action.payload.text,
        timestamp: new Date().toISOString(),
      }
      state.recentQueries = [newQuery, ...state.recentQueries].slice(0, 20)
    },
    rotateSuggestions(state, action: PayloadAction<string[]>) {
      state.suggestions = action.payload
    },
  },
})

export const { setChatInput, addRecentQuery, rotateSuggestions } = uiSlice.actions
export default uiSlice.reducer
