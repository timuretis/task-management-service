import styles from './HealthBadge.module.css';

interface HealthBadgeProps {
  isLoading: boolean;
  isOnline: boolean;
}

// Small badge that says whether the API answers. It shows words as well as a color.
export function HealthBadge({ isLoading, isOnline }: HealthBadgeProps) {
  const label = isLoading ? 'Checking API…' : isOnline ? 'API online' : 'API offline';
  const tone = isLoading ? styles.checking : isOnline ? styles.online : styles.offline;

  return (
    // role="status" lets screen readers announce a change without stealing focus.
    <span role="status" className={`${styles.badge} ${tone}`}>
      <span className={styles.dot} aria-hidden="true" />
      {label}
    </span>
  );
}
