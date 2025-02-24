import React, { useState } from 'react';
import axios from 'axios';

const AdminLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Track focus state for each input
  const [userFocus, setUserFocus] = useState(false);
  const [passFocus, setPassFocus] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      // Send credentials to the server
      const response = await axios.post('http://localhost:5000/admin/login', {
        username,
        password,
      });

      const { token, message } = response.data;
      localStorage.setItem('authToken', token);
      alert(message || 'Login successful!');
      // e.g. window.location.href = '/admin/dashboard';
    } catch (error) {
      console.error('Login error:', error);
      alert('Invalid credentials. Please try again.');
    }
  };

  return (
    <div
      style={{
        backgroundColor: '#F6F6F6',
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          maxWidth: '300px',
          width: '100%',
          margin: '0 auto',
          padding: '30px',
          borderRadius: '8px',
          backgroundColor: '#FFFFFF',
          boxShadow: '0 0 15px rgba(0, 0, 0, 0.1)',
          textAlign: 'center',
        }}
      >
        <h1 style={{ margin: 0, color: '#3B3B3B' }}>
          Swift<span style={{ color: '#45A8DA' }}>Seller</span>
        </h1>
        <h2 style={{ marginTop: 0, marginBottom: '30px', color: '#3B3B3B' }}>
          Management
        </h2>

        <form onSubmit={handleLogin}>
          <input
            style={{
              display: 'block',
              width: '90%',
              marginBottom: '15px',
              padding: '12px',
              backgroundColor: '#DDDDDD',
              borderRadius: '4px',
              boxShadow: 'inset 0 4px 6px rgba(0, 0, 0, 0.05)',
              border: 'none',
              outline: 'none',
              borderTop: userFocus
                ? '2px solid #DDDDDD'
                : '2px solid transparent',
            }}
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input
            style={{
              display: 'block',
              width: '90%',
              marginBottom: '15px',
              padding: '12px',
              backgroundColor: '#DDDDDD',
              borderRadius: '4px',
              boxShadow: 'inset 0 4px 6px rgba(0, 0, 0, 0.05)',
              border: 'none',
              outline: 'none',
              borderTop: userFocus
                ? '2px solid #DDDDDD'
                : '2px solid transparent',
            }}
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="submit"
            style={{
              backgroundColor: '#45A8DA',
              color: '#FFF',
              border: 'none',
              padding: '12px 20px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '14px',
              boxShadow: '0 6px 6px rgba(0, 0, 0, 0.1)',
            }}
          >
            Enter
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
