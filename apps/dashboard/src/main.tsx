import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ErrorBoundary } from './ErrorBoundary';
import { ToastContainer } from './ToastContainer';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <BrowserRouter>
    <ErrorBoundary>
      <App />
      <ToastContainer />
    </ErrorBoundary>
  </BrowserRouter>,
);
