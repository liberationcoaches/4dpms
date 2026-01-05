import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function Home() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to login page
    navigate('/auth/login', { replace: true });
  }, [navigate]);

  return null;
}

export default Home;

