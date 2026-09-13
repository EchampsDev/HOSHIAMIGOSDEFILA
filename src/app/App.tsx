import { BrowserRouter } from 'react-router-dom'
import { AppRoutes } from './routes'
import { AppChrome } from '../components/Layout'
export function App() { return <BrowserRouter><AppChrome><AppRoutes /></AppChrome></BrowserRouter> }
