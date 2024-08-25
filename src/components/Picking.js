import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import DatePicker, { registerLocale } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import '../stylesheets/Picking.css';
import { useTranslation } from 'react-i18next';
import uk from 'date-fns/locale/uk';
import enUS from 'date-fns/locale/en-US';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

registerLocale('uk', uk);
registerLocale('en', enUS);

const Picking = () => {
  const { t, i18n } = useTranslation();
  const [from, setFrom] = useState(null);
  const [to, setTo] = useState(null);
  const [startDate, setStartDate] = useState(new Date());
  const [passengers, setPassengers] = useState(1);
  const [locale, setLocale] = useState('uk');
  const [cityOptions, setCityOptions] = useState([]);
  const [inputValue, setInputValue] = useState('');  // Состояние для отслеживания ввода текста
  const navigate = useNavigate();

  useEffect(() => {
    if (i18n.language === 'ua') {
      setLocale('ua');
    } else {
      setLocale('en');
    }
  }, [i18n.language]);

  useEffect(() => {
    const fetchCities = async () => {
      try {
        const response = await axios.get('https://bus-travel-release-7e3983a29e39.herokuapp.com/api/cities', {});
        const cities = response.data;
        const options = cities.map(city => ({
          value: city.value,  // Используем название города
          label: i18n.language === 'ua' ? city.ukrainian : city.value
        }));
        setCityOptions(options);
      } catch (error) {
        console.error('Error fetching cities:', error);
      }
    };
    fetchCities();
  }, [i18n.language]);

  const handlePassengersChange = (event) => {
    let value = parseInt(event.target.value, 10);
    if (isNaN(value) || value < 1) value = 1;
    if (value > 120) value = 120;
    setPassengers(value);
  };

  const swapCities = () => {
    const temp = from;
    setFrom(to);
    setTo(temp);
  };

  const handleSearch = () => {
    if (!from || !to) {
      return; // Предотвращение поиска без указания городов
    }
    navigate('/search', {
      state: {
        from: from.value,  // Передаем название города
        to: to.value,      // Передаем название города
        startDate: startDate.toISOString(),
        passengers: passengers
      }
    });
  };

  return (
    <div className='picking'>
      <div className='TopPicking'>
        <i className="fa-solid fa-ticket"></i>
        <span>{t("Search_Trips_Span")}</span>
      </div>
      <div className="picking-container">
        <div className="from-to-container">
          <div className="picking-field from-field">
            <label>{t('From')}</label>
            <Select
              className="picking-select"
              value={from}
              onChange={(selectedOption) => {
                setFrom(selectedOption);
                setInputValue('');  // Очистка ввода после выбора города
              }}
              options={cityOptions}
              inputValue={inputValue}  // Добавляем состояние для ввода текста
              onInputChange={(value, { action }) => {
                if (action === 'input-change') {
                  setInputValue(value || '');  // Обновляем значение ввода, проверяем на пустую строку
                }
              }}
              placeholder={inputValue === '' && !from ? t('SelectPicking') : ''}  // Отображение placeholder, если inputValue и from пустые
              components={{ DropdownIndicator: () => null, IndicatorSeparator: () => null }}
              styles={{
                control: (provided) => ({
                  ...provided,
                  paddingRight: '40px',
                }),
                singleValue: (provided) => ({
                  ...provided,
                  marginRight: '40px',
                })
              }}
            />
          </div>
          <button className="swap-button" onClick={swapCities}>
            &#x21C4;
          </button>
          <div className="picking-field to-field">
            <label>{t('To')}</label>
            <Select
              className="picking-select"
              value={to}
              onChange={setTo}
              options={cityOptions}
              placeholder={!to ? t('SelectPicking') : ''}  // Добавляем placeholder, если to пустой
              components={{ DropdownIndicator: () => null, IndicatorSeparator: () => null }}
              styles={{
                control: (provided) => ({
                  ...provided,
                  paddingRight: '40px',
                }),
                singleValue: (provided) => ({
                  ...provided,
                  marginRight: '40px',
                }),
                input: (provided) => ({
                  ...provided,
                  textIndent: '29px'
                })
              }}
            />
          </div>
        </div>
        <div className="additional-fields">
          <div className="picking-field">
            <label>{t('Departure')}</label>
            <DatePicker
              className="picking-datepicker"
              selected={startDate}
              onChange={(date) => setStartDate(date)}
              dateFormat="dd MMM yyyy"
              locale={locale}
            />
          </div>
          <div className="picking-field">
            <label>{t('Passengers')}</label>
            <div className="picking-passengers">
              <button onClick={() => setPassengers(Math.max(passengers - 1, 1))}>-</button>
              <input
                type="number"
                value={passengers}
                onChange={handlePassengersChange}
                min="1"
                max="120"
              />
              <button onClick={() => setPassengers(Math.min(passengers + 1, 120))}>+</button>
            </div>
          </div>
          <button className="picking-search" onClick={handleSearch}><i className="fa-solid fa-magnifying-glass"></i>{t('Search')}</button>
        </div>
      </div>
    </div>
  );
};

export default Picking;
