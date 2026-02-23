import { useNavigate } from 'react-router-dom';
import styles from './Home.module.css';
import logo from '@/assets/logo.png';

function Home() {
  const navigate = useNavigate();

  return (
    <div className={styles.landing}>
      {/* Subtle animated background accents — same style as Login/SignUp */}
      <div className={styles.accentOne} />
      <div className={styles.accentTwo} />
      <div className={styles.accentGrid} />
      <div className={styles.accentThree} />

      {/* Header */}
      <header className={styles.header}>
        <div className={styles.logoContainer}>
          <img src={logo} alt="4DPMS" className={styles.logoImg} />
          <span className={styles.logoText}>4DPMS</span>
        </div>
        <nav className={styles.headerNav}>
          <button
            className={`${styles.headerBtn} ${styles.headerBtnLogin}`}
            onClick={() => navigate('/auth/login')}
          >
            Log In
          </button>
          <button
            className={`${styles.headerBtn} ${styles.headerBtnSignup}`}
            onClick={() => navigate('/auth/signup')}
          >
            Sign Up
          </button>
        </nav>
      </header>

      {/* Hero */}
      <section className={styles.hero}>
        <p className={styles.heroTagline}>By Liberation Coaches</p>
        <h1 className={styles.heroTitle}>
          The Most Powerful{' '}
          <span className={styles.heroTitleHighlight}>
            Performance Management System
          </span>{' '}
          In The World
        </h1>
        <p className={styles.heroSubtitle}>
          A comprehensive, simple, dynamic and fair method of Performance
          Management that measures and rewards performance across 4 key
          dimensions.
        </p>

        {/* CTA Buttons — side by side, enlarge on hover */}
        <div className={styles.ctaRow}>
          <button
            className={`${styles.ctaBtn} ${styles.ctaLogin}`}
            onClick={() => navigate('/auth/login')}
          >
            Log In
          </button>
          <button
            className={`${styles.ctaBtn} ${styles.ctaSignup}`}
            onClick={() => navigate('/auth/signup')}
          >
            Sign Up
          </button>
        </div>
      </section>

      {/* 4 Dimensions Strip */}
      <div className={styles.dimensionsStrip}>
        <div className={styles.dimBadge}>
          <span className={`${styles.dimDot} ${styles.dimDotBlue}`} />
          <span className={styles.dimLabel}>Functional</span>
        </div>
        <div className={styles.dimBadge}>
          <span className={`${styles.dimDot} ${styles.dimDotPurple}`} />
          <span className={styles.dimLabel}>Organizational</span>
        </div>
        <div className={styles.dimBadge}>
          <span className={`${styles.dimDot} ${styles.dimDotOrange}`} />
          <span className={styles.dimLabel}>Self-Development</span>
        </div>
        <div className={styles.dimBadge}>
          <span className={`${styles.dimDot} ${styles.dimDotGreen}`} />
          <span className={styles.dimLabel}>Developing Others</span>
        </div>
      </div>

      {/* Footer */}
      <footer className={styles.footer}>
        © {new Date().getFullYear()} Liberation Coaches Private Limited. All
        rights reserved.
      </footer>
    </div>
  );
}

export default Home;
