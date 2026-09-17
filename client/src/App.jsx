import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { LanguageProvider } from './i18n/LanguageContext'
import AdminRoute from './components/AdminRoute'
import ProtectedRoute from './components/ProtectedRoute'
import DashboardPage from './pages/DashboardPage'
import DepartmentPage from './pages/DepartmentPage'
import EmployeeFormPage from './pages/EmployeeFormPage'
import EmployeeListPage from './pages/EmployeeListPage'
import HomePage from './pages/HomePage'
import LeaveBalancePage from './pages/LeaveBalancePage'
import LeaveRequestListPage from './pages/LeaveRequestListPage'
import LeaveRequestNewPage from './pages/LeaveRequestNewPage'
import LeaveTypePage from './pages/LeaveTypePage'
import LoginPage from './pages/LoginPage'
import ManagerLeaveRequestPage from './pages/ManagerLeaveRequestPage'
import ManagerSicknessPage from './pages/ManagerSicknessPage'
import ManagerRoute from './components/ManagerRoute'
import ReportsPage from './pages/ReportsPage'
import AuditLogPage from './pages/AuditLogPage'
import SicknessEditPage from './pages/SicknessEditPage'
import SicknessListPage from './pages/SicknessListPage'
import SicknessNewPage from './pages/SicknessNewPage'
import AdminSicknessPage from './pages/AdminSicknessPage'
import ChangePasswordPage from './pages/ChangePasswordPage'
import './App.css'

function App() {
  return (
    <LanguageProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/change-password"
          element={
            <ProtectedRoute>
              <ChangePasswordPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/leave-requests"
          element={
            <ProtectedRoute>
              <LeaveRequestListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/leave-requests/new"
          element={
            <ProtectedRoute>
              <LeaveRequestNewPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/leave-balances"
          element={
            <ProtectedRoute>
              <LeaveBalancePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/leave-requests"
          element={
            <ManagerRoute>
              <ManagerLeaveRequestPage />
            </ManagerRoute>
          }
        />
        <Route
          path="/sickness-absences"
          element={
            <ProtectedRoute>
              <SicknessListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/sickness-absences/new"
          element={
            <ProtectedRoute>
              <SicknessNewPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/sickness-absences/:id/edit"
          element={
            <ProtectedRoute>
              <SicknessEditPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/sickness-absences"
          element={
            <ManagerRoute>
              <ManagerSicknessPage />
            </ManagerRoute>
          }
        />
        <Route
          path="/admin/sickness-absences"
          element={
            <AdminRoute>
              <AdminSicknessPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/employees"
          element={
            <AdminRoute>
              <EmployeeListPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/employees/new"
          element={
            <AdminRoute>
              <EmployeeFormPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/employees/:id/edit"
          element={
            <AdminRoute>
              <EmployeeFormPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/departments"
          element={
            <AdminRoute>
              <DepartmentPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/leave-types"
          element={
            <AdminRoute>
              <LeaveTypePage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/reports"
          element={
            <AdminRoute>
              <ReportsPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/audit-logs"
          element={
            <AdminRoute>
              <AuditLogPage />
            </AdminRoute>
          }
        />
      </Routes>
    </BrowserRouter>
    </LanguageProvider>
  )
}

export default App
