import './Home.css';
import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="home-container">
      <h1 className="home-title">Welcome to Available Mayhaps</h1>
      <p className="home-subtitle">Coordinate availability effortlessly with your friends, teams, and groups.</p>

      <div className="home-buttons">
        <Link to="/create-group" className="home-button primary">Create a Group</Link>
        <Link to="/signup" className="home-button">Sign Up</Link>
      </div>
    </div>
  );
}
