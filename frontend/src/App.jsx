import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material'
import TeacherDashboard from './pages/TeacherDashboard'
import EvaluatedScriptsView from './pages/EvaluationView'
import ResultView from './pages/ResultView'

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1e40af', // Academic Navy Blue
      dark: '#1e3a8a',
      light: '#3b82f6'
    },
    secondary: {
      main: '#475569', // Slate Gray
      dark: '#334155'
    },
    success: { main: '#059669' }, // Professional Green
    error: { main: '#dc2626' },
    warning: { main: '#d97706' },
    background: {
      default: '#f8fafc', // Light Slate
      paper: '#ffffff'
    },
    text: {
      primary: '#0f172a',
      secondary: '#64748b'
    }
  },
  shape: { borderRadius: 8 }, // Less rounded = More professional
  typography: {
    fontFamily: '"Inter", "Segoe UI", "Roboto", "Helvetica", sans-serif',
    h3: { fontWeight: 700, letterSpacing: '-0.025em' },
    h4: { fontWeight: 700, letterSpacing: '-0.025em' },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 500, letterSpacing: '0.01em' },
    body1: { lineHeight: 1.6 },
    body2: { lineHeight: 1.6 }
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          padding: '9px 20px',
          boxShadow: 'none',
          '&:hover': { boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)' }
        },
        containedPrimary: {
          backgroundColor: '#1e40af',
          '&:hover': { backgroundColor: '#1e3a8a' }
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
          border: '1px solid #e2e8f0',
          borderRadius: 8
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
        elevation1: { boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)' }
      }
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { borderRadius: 4, height: 8 }
      }
    }
  }
})

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<TeacherDashboard />} />
          <Route path="/evaluation" element={<EvaluatedScriptsView />} />
          <Route path="/result/:roll" element={<ResultView />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}