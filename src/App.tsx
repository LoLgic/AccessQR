import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import RequireRole, { ALL_ROLES } from './auth/RequireRole'
import AppLayout from './layouts/AppLayout'
import MobileLayout from './layouts/MobileLayout'
import { homeFor } from './lib/labels'
import Dashboard from './pages/Dashboard'
import Employees from './pages/Employees'
import ForgotPassword from './pages/ForgotPassword'
import History from './pages/History'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Porteria from './pages/Porteria'
import Reports from './pages/Reports'
import ResetPassword from './pages/ResetPassword'
import Settings from './pages/Settings'
import Users from './pages/Users'
import AccessResult from './pages/mobile/AccessResult'
import Carnet from './pages/mobile/Carnet'
import EmployeeHome from './pages/mobile/EmployeeHome'
import MyHistory from './pages/mobile/MyHistory'
import MyQr from './pages/mobile/MyQr'
import Scanner from './pages/mobile/Scanner'

function RoleHome() {
  const { user } = useAuth()
  return <Navigate to={user ? homeFor(user.role) : '/login'} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/recuperar" element={<ForgotPassword />} />
      <Route path="/restablecer" element={<ResetPassword />} />

      {/* Administrador */}
      <Route
        path="/app"
        element={
          <RequireRole roles={['admin']}>
            <AppLayout variant="admin" />
          </RequireRole>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="empleados" element={<Employees />} />
        <Route path="historial" element={<History />} />
        <Route path="usuarios-y-roles" element={<Users />} />
        <Route path="reportes" element={<Reports />} />
        <Route path="configuracion" element={<Settings />} />
        <Route path="credenciales" element={<Navigate to="/app/empleados?credential=por_revisar" replace />} />
        <Route path="escanear-qr" element={<Navigate to="/m/escaner" replace />} />
      </Route>

      {/* Control de acceso (portería), versión escritorio */}
      <Route
        path="/porteria"
        element={
          <RequireRole roles={['admin', 'control_acceso']}>
            <AppLayout variant="porteria" />
          </RequireRole>
        }
      >
        <Route index element={<Porteria />} />
        <Route path="escanear" element={<Navigate to="/m/escaner" replace />} />
        <Route path="accesos" element={<History />} />
        <Route path="historial" element={<History />} />
      </Route>

      {/* Vistas móviles */}
      <Route
        path="/m"
        element={
          <RequireRole roles={ALL_ROLES}>
            <MobileLayout />
          </RequireRole>
        }
      >
        <Route index element={<RoleHome />} />
        <Route
          path="escaner"
          element={
            <RequireRole roles={['admin', 'control_acceso']}>
              <Scanner />
            </RequireRole>
          }
        />
        <Route
          path="resultado"
          element={
            <RequireRole roles={['admin', 'control_acceso']}>
              <AccessResult />
            </RequireRole>
          }
        />
        <Route path="inicio" element={<EmployeeHome />} />
        <Route path="carnet" element={<Carnet />} />
        <Route path="qr" element={<MyQr />} />
        <Route path="historial" element={<MyHistory />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
