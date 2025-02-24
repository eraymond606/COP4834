import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function ManagementScreen() {
  const navigate = useNavigate();
  const handleBackClick = () => {
    navigate('/Admin');
    console.log('Back button clicked');
  };

  const handleMenuClick = () => {
    navigate('/MenuConfig');
    console.log('Menu button clicked');
  };

  const handleEmployeesClick = () => {
    navigate('/EmployeeConfig');
    console.log('Employees button clicked');
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>
        Swift
        <span style={{ color: '#45A8DA' }}>Seller</span>
      </h1>
      <h2 style={styles.title2}>Management</h2>
      <button style={styles.backButton} onClick={handleBackClick}>
        Back
      </button>

      {/* Buttons */}
      <div style={styles.buttonContainer}>
        <button style={styles.button} onClick={handleMenuClick}>
          Menu
        </button>
        <button style={styles.button} onClick={handleEmployeesClick}>
          Employees
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    backgroundColor: '#F6F6F6',
    minHeight: '100vh',
    margin: 0,
    padding: 0,
    fontFamily: 'sans-serif',
  },

  title: {
    margin: 0,
    color: '#3b3b3b',
    fontWeight: 'bold',
  },

  title2: {
    margin: 0,
    color: '#3b3b3b',
    fontWeight: 'bold',
  },

  backButton: {
    position: 'absolute',
    top: '40px',
    left: '40px',
    backgroundColor: '#45A8DA',
    color: '#fff',
    border: 'none',
    padding: '8px 16px',
    cursor: 'pointer',
    borderRadius: '4px',
  },

  buttonContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: '100px',
  },

  button: {
    backgroundColor: '#45A8DA',
    color: '#fff',
    border: 'none',
    padding: '16px 32px',
    margin: '10px 0px',
    cursor: 'pointer',
    borderRadius: '4px',
    fontSize: '16px',
    width: '200px',
  },
};
