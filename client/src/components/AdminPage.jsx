import { Link } from 'react-router-dom'
import AppHeader from './AppHeader'

function AdminPage({ title, eyebrow, lead, actions, children }) {
  return (
    <div className="page">
      <AppHeader />
      <main>
        <section className="hero dashboard-hero admin-hero">
          <p className="eyebrow">{eyebrow}</p>
          <div className="admin-heading">
            <div>
              <h1>{title}</h1>
              {lead ? <p className="lead">{lead}</p> : null}
            </div>
            {actions}
          </div>
          <p className="back-link-wrap">
            <Link to="/dashboard">Zurück zur Übersicht</Link>
          </p>
        </section>
        <section className="admin-content">{children}</section>
      </main>
      <footer className="footer">
        <p>
          System zur Verwaltung von Urlauben und Abwesenheiten · Bachelorarbeit
        </p>
      </footer>
    </div>
  )
}

export default AdminPage
