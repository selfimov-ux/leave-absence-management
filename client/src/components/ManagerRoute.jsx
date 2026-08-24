import { Navigate } from 'react-router-dom'
import { getUser, isAuthenticated } from '../authStorage'

function ManagerRoute({ children }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />
  }

  const user = getUser()
  if (user?.role !== 'MANAGER') {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

export default ManagerRoute
