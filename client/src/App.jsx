import { BrowserRouter, Route, Routes } from 'react-router-dom'
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
import ManagerRoute from './components/ManagerRoute'
import ReportsPage from './pages/ReportsPage'
import './App.css'

function App() {
  return (
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
      </Routes>
    </BrowserRouter>
  )
}

export default App
