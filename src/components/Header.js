import React, { useContext, useEffect, useState } from 'react';
import '../stylesheets/Header.css';
import LogoBig from '../images/logo_big.png';
import { useTranslation } from 'react-i18next';
import { StoreContext } from '../store/store';
import LanguageSwitcher from './LanguageSwitcher'; // Импортируем LanguageSwitcher

function Header() {
  const { t } = useTranslation();
  const store = useContext(StoreContext);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDimmed, setIsDimmed] = useState(false); // Состояние для затемнения
  const [currentPath] = useState(window.location.pathname); // Текущее положение


  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      store.checkAuth().then(() => {
        console.log("Authentication check completed");
      }).catch(error => {
        console.error("Error during authentication check:", error);
      });
    }

    // Обработчик изменения размера окна
    const handleResize = () => {
      if (window.innerWidth > 680) {
        setIsMenuOpen(false);
        setIsDimmed(false); // Убираем затемнение при увеличении ширины экрана
      }
    };

    window.addEventListener('resize', handleResize);

    // Удаление обработчика при размонтировании компонента
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [store]);

  const handleLoginClick = () => {
    window.location.href = '/Authorisation'; // Редирект на страницу авторизации
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
    setIsDimmed(!isDimmed); // Переключаем затемнение при открытии/закрытии меню
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
    setIsDimmed(false); // Убираем затемнение при закрытии меню
  };

  const getLinkClass = (path) => {
    return currentPath === path ? 'active' : '';
  };

  return (
    <div className="Header">
      {/* Затемняющий слой */}
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
        <LanguageSwitcher /> {/* Добавляем LanguageSwitcher перед иконкой пользователя */}

        {
          store.isAuth ? (
            <div className='User'>
              <a href='/account'>
                <i className="fa-solid fa-user"></i>
              </a>
            </div>
          ) : (
            <div className='NotLogged'>
              <a href='/Authorisation' onClick={handleLoginClick}>{t('ProposeLogin')}</a>
            </div>
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
