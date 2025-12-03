import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Navigation } from './components/Navigation';
import { MainPage } from './pages/MainPage';
import { StakePage } from './pages/StakePage';
import { EarnPage } from './pages/EarnPage';

function App() {
  return (
    <BrowserRouter>
      <div>
        <Navigation />
        <hr />
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/stake" element={<StakePage />} />
          <Route path="/earn" element={<EarnPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
