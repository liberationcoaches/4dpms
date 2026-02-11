import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import styles from './Performance.module.css';

interface DimensionScores {
  functional: number;
  organizational: number;
  selfDevelopment: number;
  developingOthers: number;
}

interface DimensionWeights {
  functional: number;
  organizational: number;
  selfDevelopment: number;
  developingOthers: number;
}

interface HistoricalScore {
  period: number;
  score: number;
  fourDIndex: number;
  dimensions: DimensionScores;
}

interface PerformanceData {
  currentScore: number;
  dimensionScores: DimensionScores;
  dimensionWeights: DimensionWeights;
  historicalScores: HistoricalScore[];
  currentPeriod: number;
}

function Performance() {
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPerformanceData();
  }, []);

  const fetchPerformanceData = async () => {
    try {
      const userId = localStorage.getItem('userId');
      const res = await fetch(`/api/employee/performance?userId=${userId}`);
      const data = await res.json();
      
      if (data.status === 'success') {
        setPerformanceData(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch performance data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 4) return '#4CAF50';
    if (score >= 3) return '#2196F3';
    if (score >= 2) return '#ff9800';
    return '#f44336';
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 4) return 'Excellent';
    if (score >= 3) return 'Good';
    if (score >= 2) return 'Needs Improvement';
    return 'Below Expectations';
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <h2 className={styles.title}>My Performance</h2>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  if (!performanceData) {
    return (
      <div className={styles.container}>
        <h2 className={styles.title}>My Performance</h2>
        <div className={styles.noData}>
          <p>No performance data available yet.</p>
          <p className={styles.description}>
            Your scores will appear here once your supervisor has evaluated your KRAs.
          </p>
        </div>
      </div>
    );
  }

  const { currentScore, dimensionScores, dimensionWeights, historicalScores, currentPeriod } = performanceData;

  // Prepare chart data
  const chartData = historicalScores.map(hs => ({
    name: hs.period === 0 ? 'Pilot' : `R${hs.period}`,
    'Functional': hs.dimensions?.functional || 0,
    'Organizational': hs.dimensions?.organizational || 0,
    'Self Dev': hs.dimensions?.selfDevelopment || 0,
    'Dev Others': hs.dimensions?.developingOthers || 0,
    '4D Index': hs.fourDIndex || hs.score || 0,
  }));

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>My Performance</h2>
      
      {/* Overall Score Card */}
      <div className={styles.scoreCard}>
        <div className={styles.scoreLabel}>4D Index (Overall Score)</div>
        <div className={styles.scoreValue}>{currentScore.toFixed(2)}</div>
        <div className={styles.scoreSubtext}>
          {getScoreLabel(currentScore)} • Current Period: R{currentPeriod}
        </div>
      </div>

      {/* Dimension Scores */}
      <div className={styles.dimensionsGrid}>
        {[
          { key: 'functional', name: 'Functional', className: 'functional' },
          { key: 'organizational', name: 'Organizational', className: 'organizational' },
          { key: 'selfDevelopment', name: 'Self Development', className: 'selfDevelopment' },
          { key: 'developingOthers', name: 'Developing Others', className: 'developingOthers' },
        ].map((dim) => {
          const score = dimensionScores[dim.key as keyof DimensionScores] || 0;
          const weight = dimensionWeights[dim.key as keyof DimensionWeights] || 0;
          return (
            <div key={dim.key} className={styles.dimensionCard}>
              <div className={styles.dimensionHeader}>
                <span className={styles.dimensionName}>{dim.name}</span>
                <span className={styles.dimensionWeight}>{weight}%</span>
              </div>
              <div className={styles.dimensionScore}>{score.toFixed(2)}</div>
              <div className={styles.progressBar}>
                <div 
                  className={`${styles.progressFill} ${styles[dim.className]}`}
                  style={{ width: `${(score / 5) * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Historical Scores Chart */}
      {chartData.length > 0 && (
        <div className={styles.chartContainer}>
          <h3 className={styles.sectionTitle}>Performance Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 5]} />
              <Tooltip />
              <Legend />
              <Bar dataKey="4D Index" fill="#667eea" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Historical Scores List */}
      {historicalScores.length > 0 && (
        <div className={styles.historySection}>
          <h3 className={styles.sectionTitle}>Score History</h3>
          <div className={styles.historyGrid}>
            {historicalScores.map((hs) => (
              <div key={hs.period} className={styles.historyItem}>
                <div className={styles.historyPeriod}>
                  {hs.period === 0 ? 'Pilot' : `Review ${hs.period}`}
                </div>
                <div 
                  className={styles.historyScore}
                  style={{ color: getScoreColor(hs.fourDIndex || hs.score) }}
                >
                  {(hs.fourDIndex || hs.score).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Performance;

