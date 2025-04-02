import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext.tsx';
import { SpeedInsights } from "@vercel/speed-insights/react" // Import SpeedInsights
import './index.css';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <SpeedInsights /> {/* Add SpeedInsights component */}
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
