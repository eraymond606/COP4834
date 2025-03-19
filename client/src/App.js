import React from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
// import Header from './components/Header';
import Home from './components/Home';
import Configure from './components/ConfigOptions';
import Orders from './components/Orders';
import Admin from './components/Admin';
import EmployeeConfig from './components/EmployeeConfig';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        {/* <Header /> */}
        {/* <nav>
          <Link to="/">Home</Link> | <Link to="/ConfigOptions">Configure</Link>{' '}
          | <Link to="/orders">Orders</Link> | <Link to="/admin">Admin</Link>
        </nav> */}
        <Routes>
          <Route path="/" element={<Admin />} />
          <Route path="/ConfigOptions" element={<Configure />} />
          {/* <Route path="/orders" element={<Orders />} /> */}
          <Route path="/admin" element={<Admin />} />
          <Route path="/EmployeeConfig" element={<EmployeeConfig />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

