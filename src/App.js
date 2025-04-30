// src/App.js
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Signup from './pages/signup';
import Login from './pages/login';
import CreateGroup from './pages/CreateGroup';
import GroupPage from './pages/GroupPage';
import Navbar from './components/NavBar';
import ProtectedRoute from './components/protectedRoute';

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/create-group" element={
          <ProtectedRoute>
            <CreateGroup />
          </ProtectedRoute>
        } />
        <Route path="/group/:groupId" element={
          <ProtectedRoute>
            <GroupPage />
          </ProtectedRoute>
        } />
        <Route path="*" element={<h1>404 Not Found</h1>} />
      </Routes>
    </Router>
  );
}

export default App;
