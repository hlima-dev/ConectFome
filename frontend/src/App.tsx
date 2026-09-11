import { Navigate, Route, Routes } from 'react-router-dom'
import { PrivateRoute } from './routes/PrivateRoute'
import { RoleRoute } from './routes/RoleRoute'
import { AppLayout } from './layouts/AppLayout'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { Dashboard } from './pages/Dashboard'
import { DonorsPage } from './pages/donors/DonorsPage'
import { RecipientsPage } from './pages/recipients/RecipientsPage'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/cadastro" element={<Register />} />

      <Route
        path="/"
        element={
          <PrivateRoute>
            <AppLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route
          path="doadores"
          element={
            <RoleRoute roles={['ADMIN']}>
              <DonorsPage />
            </RoleRoute>
          }
        />
        <Route
          path="receptores"
          element={
            <RoleRoute roles={['ADMIN']}>
              <RecipientsPage />
            </RoleRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
