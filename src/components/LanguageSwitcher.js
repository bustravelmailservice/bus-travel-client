import React from 'react';
import { useTranslation } from 'react-i18next';
import '../stylesheets/LanguageSwitcher.css';
import UaFlag from '../images/uaflag.png';
import EngFlag from '../images/engflag.png';

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const currentLanguage = i18n.language;

  const changeLanguage = () => {
    if (currentLanguage === 'ua') {
      i18n.changeLanguage('en');
    } else {
      i18n.changeLanguage('ua');
    }
  };

  const flagSrc = currentLanguage === 'ua' ? EngFlag : UaFlag;

  return (
    <div className='LanguageSwitcherSetup'>
      <div className='Flag' onClick={changeLanguage}>
        <img src={flagSrc} alt='Change Language' />
      </div>
    </div>
  );
};

export default LanguageSwitcher;
