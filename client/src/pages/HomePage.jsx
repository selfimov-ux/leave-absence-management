import { Link } from 'react-router-dom'

function HomePage() {
  return (
    <div className="page">
      <header className="header">
        <div className="header-inner">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true">
              UA
            </span>
            <span className="brand-name">Urlaubsverwaltung</span>
          </div>
          <Link to="/login" className="btn-login">
            Anmelden
          </Link>
        </div>
      </header>

      <main>
        <section className="hero">
          <p className="eyebrow">Bachelorarbeit · Webanwendung</p>
          <h1>System zur Verwaltung von Urlauben und Abwesenheiten</h1>
          <p className="lead">
            Mitarbeiter können Urlaubsanträge und Krankmeldungen einreichen.
            Vorgesetzte und Administratoren können diese verwalten und
            bearbeiten.
          </p>
          <Link to="/login" className="btn-primary">
            Anmelden
          </Link>
        </section>

        <section className="roles" aria-labelledby="roles-heading">
          <h2 id="roles-heading">Benutzerrollen</h2>
          <p className="roles-intro">
            Das System unterstützt drei Rollen mit klar abgegrenzten Aufgaben.
          </p>
          <div className="cards">
            <article className="card">
              <span className="card-label">Rolle</span>
              <h3>Mitarbeiter</h3>
              <p>
                Urlaubsanträge und Krankmeldungen erstellen und einsehen.
              </p>
            </article>
            <article className="card">
              <span className="card-label">Rolle</span>
              <h3>Vorgesetzte</h3>
              <p>
                Anträge der eigenen Abteilung prüfen und bearbeiten.
              </p>
            </article>
            <article className="card">
              <span className="card-label">Rolle</span>
              <h3>Administratoren</h3>
              <p>
                Mitarbeiter, Abteilungen, Urlaubsarten und Berichte verwalten.
              </p>
            </article>
          </div>
        </section>
      </main>

      <footer className="footer">
        <p>
          System zur Verwaltung von Urlauben und Abwesenheiten · Bachelorarbeit
        </p>
      </footer>
    </div>
  )
}

export default HomePage
