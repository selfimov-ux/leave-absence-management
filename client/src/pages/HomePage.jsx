import { Link } from 'react-router-dom'
import PublicHeader from '../components/PublicHeader'
import { useLanguage } from '../i18n/LanguageContext'

function HomePage() {
  const { t } = useLanguage()

  return (
    <div className="page">
      <PublicHeader
        actions={
          <Link to="/login" className="btn-login">
            {t('common.login')}
          </Link>
        }
      />

      <main>
        <section className="hero">
          <p className="eyebrow">{t('home.eyebrow')}</p>
          <h1>{t('home.title')}</h1>
          <p className="lead">{t('home.lead')}</p>
          <Link to="/login" className="btn-primary">
            {t('common.login')}
          </Link>
        </section>

        <section className="roles" aria-labelledby="roles-heading">
          <h2 id="roles-heading">{t('home.rolesHeading')}</h2>
          <p className="roles-intro">{t('home.rolesIntro')}</p>
          <div className="cards">
            <article className="card">
              <span className="card-label">{t('home.roleLabel')}</span>
              <h3>{t('home.employeeTitle')}</h3>
              <p>{t('home.employeeText')}</p>
            </article>
            <article className="card">
              <span className="card-label">{t('home.roleLabel')}</span>
              <h3>{t('home.managerTitle')}</h3>
              <p>{t('home.managerText')}</p>
            </article>
            <article className="card">
              <span className="card-label">{t('home.roleLabel')}</span>
              <h3>{t('home.adminTitle')}</h3>
              <p>{t('home.adminText')}</p>
            </article>
          </div>
        </section>
      </main>

      <footer className="footer">
        <p>{t('common.footer')}</p>
      </footer>
    </div>
  )
}

export default HomePage
