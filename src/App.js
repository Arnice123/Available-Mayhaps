import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Signup from './pages/Signup';
import Login from './pages/Login';
import CreateGroup from './pages/CreateGroup';
import GroupPage from './pages/GroupPage';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import CreateEvent from './pages/CreateEvent';

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
        <Route path="/group/:groupId/createEvent" element={
          <ProtectedRoute>
            <CreateEvent />
          </ProtectedRoute>
        } />
        <Route path="*" element={<h1>404 Not Found</h1>} />
      </Routes>
    </Router>
  );
}

export default App;
