import { Routes, Route, Navigate } from 'react-router-dom'
import HomePage from './pages/HomePage'


// Future pages — stub components until implemented
const BrowseLawsPage = () => <div>Browse Laws</div>
const CompareLawsPage = () => <div>Compare Laws</div>
const SavedPage = () => <div>Saved</div>
const HistoryPage = () => <div>History</div>
const LawDetailPage = () => <div>Law Detail</div>

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/chat" element={<ChatPage />} />
      <Route path="/browse-laws" element={<BrowseLawsPage />} />
      <Route path="/compare-laws" element={<CompareLawsPage />} />
      <Route path="/saved" element={<SavedPage />} />
      <Route path="/history" element={<HistoryPage />} />
      <Route path="/laws/:id" element={<LawDetailPage />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}
