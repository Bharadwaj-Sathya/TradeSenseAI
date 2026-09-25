import { Routes, Route, Navigate } from 'react-router-dom'
import TradeLayout from './components/TradeLayout'
import HomePage from './pages/HomePage'
import StrategiesPage from './pages/StrategiesPage'
import SettingsPage from './pages/SettingsPage'

export default function App() {
  return (
    <Routes>
      <Route element={<TradeLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/dashboard" element={<HomePage />} />
        <Route path="/strategies" element={<StrategiesPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}
