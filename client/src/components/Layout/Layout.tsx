import { Outlet, useLocation } from 'react-router-dom';
import styles from './Layout.module.css';

function Layout() {
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  // Don't show header/footer on home page
  if (isHomePage) {
    return (
      <div className={styles.layout}>
        <main className={styles.main}>
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <h1 className={styles.title}>4DPMS</h1>
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
      <footer className={styles.footer}>
        <p>&copy; 2025 4DPMS</p>
      </footer>
    </div>
  );
}

export default Layout;

