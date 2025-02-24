import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function EmployeeConfig() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [groupedData, setGroupedData] = useState([]);
  //"Add Employee":
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedJobCodeId, setSelectedJobCodeId] = useState(null);
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const employeesRes = await fetch(
        'https://cop4834-project-server.onrender.com/api/employees'
      );
      const jobCodesRes = await fetch(
        'https://cop4834-project-server.onrender.com/api/jobcodes'
      );
      const empJobCodesRes = await fetch(
        'https://cop4834-project-server.onrender.com/api/employee_job_codes'
      );

      if (!employeesRes.ok || !jobCodesRes.ok || !empJobCodesRes.ok) {
        throw new Error('One or more API calls failed');
      }

      const employeesData = await employeesRes.json();
      const jobCodesData = await jobCodesRes.json();
      const empJobCodesData = await empJobCodesRes.json();

      // Build a map of pin -> [job_code_id, job_code_id, ...]
      const pinToJobCodesMap = {};
      empJobCodesData.forEach((link) => {
        if (!pinToJobCodesMap[link.pin]) {
          pinToJobCodesMap[link.pin] = [];
        }
        pinToJobCodesMap[link.pin].push(link.job_code_id);
      });

      // For each employee, figure out all job code names they have
      const employeesWithJobs = employeesData.map((emp) => {
        const codesForEmp = pinToJobCodesMap[emp.pin] || [];
        const codeNames = codesForEmp.map((codeId) => {
          const job = jobCodesData.find((jc) => jc.job_code_id === codeId);
          return job ? job.code_name : '';
        });
        return {
          ...emp,
          jobCodeNames: codeNames,
        };
      });

      // Group by each job code ID
      const grouped = jobCodesData.map((jobCode) => {
        const employeesInThisCode = employeesWithJobs
          .filter((emp) => {
            return pinToJobCodesMap[emp.pin]?.includes(jobCode.job_code_id);
          })
          .map((emp) => ({
            pin: emp.pin,
            firstName: emp.first_name,
            lastName: emp.last_name,
            jobCodes: emp.jobCodeNames,
          }));

        return {
          jobCodeId: jobCode.job_code_id,
          codeName: jobCode.code_name,
          employees: employeesInThisCode,
        };
      });

      setGroupedData(grouped);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }
  //"Add Employee" button click
  function handleAddEmployeeClick(jobCodeId) {
    setSelectedJobCodeId(jobCodeId);
    setShowAddModal(true);
  }

  //POST to create the employee
  async function handleCreateEmployee() {
    try {
      const response = await fetch(
        'https://cop4834-project-server.onrender.com/api/employees',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            first_name: newFirstName,
            last_name: newLastName,
            job_code_id: selectedJobCodeId,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to create employee');
      }

      // Clear modal state
      setNewFirstName('');
      setNewLastName('');
      setShowAddModal(false);

      // Refresh data so the new employee appears in the list
      fetchData();
    } catch (error) {
      console.error('Error creating employee:', error);
      // Optionally show an error message to the user
    }
  }

  const handleBackClick = () => {
    navigate('/ConfigOptions');
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button style={styles.backButton} onClick={handleBackClick}>
          Back
        </button>
        <h1 style={styles.title}>
          Swift <span style={{ color: '#45A8DA' }}>Seller</span>
        </h1>
        <h2 style={styles.title2}>Management</h2>
      </div>

      {loading && (
        <div style={styles.loadingContainer}>
          <p>Loading employee data...</p>
        </div>
      )}

      {error && (
        <div style={styles.errorContainer}>
          <p>Error: {error}</p>
          <button onClick={fetchData} style={styles.retryButton}>
            Retry
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          <div style={styles.employeesTitle}>
            <h2 style={{ margin: 0, color: '#3b3b3b' }}>Employees</h2>
          </div>

          <div style={styles.lightGreyBox}>
            <div style={styles.tableHeaderRow}>
              <div style={{ ...styles.headerCell, flex: 1 }}>Name</div>
              <div style={{ ...styles.headerCell, flex: 1 }}>Emp. Number</div>
              <div style={{ ...styles.headerCell, flex: 1 }}>Jobs</div>
            </div>

            {groupedData.map((category) => {
              if (category.employees.length === 0) {
                return null;
              }

              return (
                <div key={category.jobCodeId} style={styles.categorySection}>
                  <div style={styles.employeeRow}>
                    <div
                      style={{
                        ...styles.employeeCell,
                        flex: 1,
                        fontWeight: 'bold',
                      }}
                    >
                      {category.codeName}
                    </div>
                    <div style={{ ...styles.employeeCell, flex: 1 }} />
                    <div style={{ ...styles.employeeCell, flex: 1 }} />
                    {/* Add Employee Button */}
                    <button
                      style={styles.addEmployeeButton}
                      onClick={() => handleAddEmployeeClick(category.jobCodeId)}
                    >
                      Add Employee+
                    </button>
                  </div>

                  {category.employees.map((emp) => (
                    <div key={emp.pin} style={styles.employeeRow}>
                      <div style={{ ...styles.employeeCell, flex: 1 }}>
                        {emp.firstName} {emp.lastName}
                      </div>
                      <div style={{ ...styles.employeeCell, flex: 1 }}>
                        {emp.pin}
                      </div>
                      <div style={{ ...styles.employeeCell, flex: 1 }}>
                        {emp.jobCodes.join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </>
      )}
      {/* Modal for adding an employee */}
      {showAddModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3 style={{ marginTop: 0 }}>Add Employee</h3>
            <label>
              First Name:
              <input
                type="text"
                value={newFirstName}
                onChange={(e) => setNewFirstName(e.target.value)}
                style={styles.inputField}
              />
            </label>
            <label>
              Last Name:
              <input
                type="text"
                value={newLastName}
                onChange={(e) => setNewLastName(e.target.value)}
                style={styles.inputField}
              />
            </label>

            <div style={{ marginTop: '10px' }}>
              <button
                style={styles.createButton}
                onClick={handleCreateEmployee}
              >
                Create
              </button>
              <button
                style={styles.cancelButton}
                onClick={() => setShowAddModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
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
    position: 'relative',
  },
  header: {
    position: 'relative',
    width: '100%',
    textAlign: 'center',
    padding: '20px 0',
  },
  backButton: {
    position: 'absolute',
    top: '0px',
    left: '20px',
    backgroundColor: '#45A8DA',
    color: '#fff',
    border: 'none',
    padding: '8px 16px',
    cursor: 'pointer',
    borderRadius: '4px',
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
  employeesTitle: {
    marginTop: '20px',
    marginLeft: '40px',
  },
  lightGreyBox: {
    backgroundColor: '#DDDDDD',
    margin: '20px 40px',
    padding: '20px',
    borderRadius: '4px',
  },
  tableHeaderRow: {
    display: 'flex',
    borderBottom: '1px solid #bbb',
    paddingBottom: '8px',
    marginBottom: '8px',
  },
  headerCell: {
    fontWeight: 'bold',
    color: '#3b3b3b',
  },
  categorySection: {
    marginBottom: '20px',
  },
  employeeRow: {
    display: 'flex',
    marginLeft: '10px',
    marginBottom: '5px',
  },
  employeeCell: {
    color: '#3b3b3b',
  },
  loadingContainer: {
    textAlign: 'center',
    padding: '20px',
    color: '#3b3b3b',
  },
  errorContainer: {
    textAlign: 'center',
    padding: '20px',
    color: 'red',
  },
  retryButton: {
    backgroundColor: '#45A8DA',
    color: '#fff',
    border: 'none',
    padding: '8px 16px',
    cursor: 'pointer',
    borderRadius: '4px',
    marginTop: '10px',
  },
  addEmployeeButton: {
    backgroundColor: '#45A8DA',
    color: '#fff',
    border: 'none',
    padding: '6px 12px',
    cursor: 'pointer',
    borderRadius: '4px',
  },
  // Modal styles
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '4px',
    minWidth: '300px',
  },
  inputField: {
    display: 'block',
    margin: '5px 0 10px',
    width: '100%',
    padding: '8px',
    boxSizing: 'border-box',
  },
  createButton: {
    backgroundColor: '#45A8DA',
    color: '#fff',
    border: 'none',
    padding: '8px 16px',
    cursor: 'pointer',
    borderRadius: '4px',
    marginRight: '10px',
  },
  cancelButton: {
    backgroundColor: '#ccc',
    border: 'none',
    padding: '8px 16px',
    cursor: 'pointer',
    borderRadius: '4px',
  },
};
