import { configureStore, combineReducers } from '@reduxjs/toolkit'
import { persistStore, persistReducer } from 'redux-persist'
// Use ESM import for Vite compatibility
import { default as storage } from 'redux-persist/es/storage'
import uiReducer from './slices/uiSlice'

const rootReducer = combineReducers({ ui: uiReducer })

const persistConfig = {
  key: 'india-legal-ai',
  storage,
  whitelist: ['ui'],
}

const persistedReducer = persistReducer(persistConfig, rootReducer)

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
})

export const persistor = persistStore(store)
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
