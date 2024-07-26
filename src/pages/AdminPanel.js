import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import "../components/Sidebar.css";
import MainContent from '../components/MainContent';
import axios from 'axios';

function AdminPanel() {
  const [section, setSection] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const accessToken = localStorage.getItem('accessToken');
        const response = await axios.get('/api/role', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        console.log('Current user role:', response.data.role); // Лог для перевірки ролі
        if (response.data.role === 'admin') {
          setIsAdmin(true);
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, []);

  const onSelectSection = (sectionName) => {
    setSection(sectionName);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAdmin) {
    return <div>Access denied. Admins only.</div>;
  }

  return (
    <div className='AdminPanel'>
      <MainContent section={section} />
      <Sidebar onSelectSection={onSelectSection} />
    </div>
  );
}

export default AdminPanel;
