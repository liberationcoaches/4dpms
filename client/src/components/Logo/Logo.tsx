import styles from './Logo.module.css';
import logoImage from '@/assets/logo.png';

function Logo() {
  return (
    <div className={styles.logoContainer}>
      <img src={logoImage} alt="4DPMS Logo" className={styles.logoImage} />
      <span className={styles.logoText}>4DPMS</span>
    </div>
  );
}

export default Logo;
