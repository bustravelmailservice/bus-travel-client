import React, { useContext, useEffect, useState } from 'react';
import '../stylesheets/Header.css';
import LogoBig from '../images/logo_big.png';
import { useTranslation } from 'react-i18next';
import { StoreContext } from '../store/store';
import LanguageSwitcher from './LanguageSwitcher'; // Імпортуємо оновлений LanguageSwitcher

function Header() {
  const { t } = useTranslation();
  const store = useContext(StoreContext);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDimmed, setIsDimmed] = useState(false); 
  const [currentPath] = useState(window.location.pathname); 

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      store.checkAuth().then(() => {
        console.log("Authentication check completed");
      }).catch(error => {
        console.error("Error during authentication check:", error);
      });
    }

    const handleResize = () => {
      if (window.innerWidth > 680) {
        setIsMenuOpen(false);
        setIsDimmed(false); 
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [store]);

  const handleLoginClick = () => {
    window.location.href = '/Authorisation'; 
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
    setIsDimmed(!isDimmed); 
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
    setIsDimmed(false); 
  };

  const getLinkClass = (path) => {
    return currentPath === path ? 'active' : '';
  };

  return (
    <div className="Header">
      <div className={`overlay ${isDimmed ? 'visible' : ''}`} onClick={closeMenu}></div>

      <div className="Logo">
        <a href="/">
          <img src={LogoBig} alt="Logo" />
        </a>
      </div>

      <div className="links">
        <a href="/map" className={getLinkClass('/map')}>{t('F_Link')}</a>
        <a href={store.isAuth ? "/travels" : "/Authorisation"} className={getLinkClass('/travels')}>{t('S_Link')}</a>
        <a href="/routes" className={getLinkClass('/routes')}>{t('T_Link')}</a>
        <a href="/help" className={getLinkClass('/help')}>{t('Th_Link')}</a>
      </div>

      <div className='UserAndLang'>
        <LanguageSwitcher /> 

        {
          store.isAuth ? (
            <div className='User'>
              <a href='/account'>
                <i className="fa-solid fa-user"></i>
              </a>
            </div>
          ) : (
            <a href='/Authorisation' className='NotLogged'>
              <a href='/Authorisation' onClick={handleLoginClick}>{t('ProposeLogin')}</a>
            </a>
          )
        }

        <div className='BurgerButton' onClick={toggleMenu}>
          <i className="fa-solid fa-bars"></i>
        </div>

        <div className={`links-container ${isMenuOpen ? 'visible' : ''}`}>
          <div className='close-button' onClick={closeMenu}>
            <i className="fa-solid fa-xmark"></i>
          </div>
          <div className='links'>
            <a href="/map" className={getLinkClass('/map')}><span>{t('F_Link')}</span><i className="fa-solid fa-chevron-right"></i></a>
            <a href="/travels" className={getLinkClass('/travels')}><span>{t('S_Link')}</span><i className="fa-solid fa-chevron-right"></i></a>
            <a href="/routes" className={getLinkClass('/routes')}><span>{t('T_Link')}</span><i className="fa-solid fa-chevron-right"></i></a>
            <a href="/help" className={getLinkClass('/help')}><span>{t('Th_Link')}</span><i className="fa-solid fa-chevron-right"></i></a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Header;
