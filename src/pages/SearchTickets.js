import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import '../stylesheets/SearchTickets.css';
import Ticket from '../components/Ticket';
import axios from 'axios';
import { Helmet } from 'react-helmet-async';

function SearchTickets() {
  const { t } = useTranslation();
  const location = useLocation();
  const { from, to, startDate, passengers } = location.state || {};

  console.log('Переданные параметры:', { from, to, startDate, passengers });

  const [visibleTravels, setVisibleTravels] = useState([]);  // Хранит видимые билеты
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Максимальная дата поиска (20 дней вперед от startDate)
  const endDate = useMemo(() => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + 20);  // +20 дней к startDate
    return date;
  }, [startDate]);

  // Дата начала поиска для ежедневных поездок (01.06.2024)
  const dailyStartDate = useMemo(() => new Date('2024-06-01'), []);

  // Функция для загрузки поездок
  const loadTravels = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('Начинаем загрузку поездок...');

      const response = await axios.get('https://bus-travel-release-7e3983a29e39.herokuapp.com/api/flights/', {
        params: { from, to }
      });

      console.log('Ответ от сервера:', response.data);
      const travels = response.data;

      if (travels.length === 0) {
        console.log('Поездки не найдены');
        setVisibleTravels([]);
        setIsLoading(false);
        return;
      }

      let currentTravels = [];

      // Шаг 1: Фильтрация одноразовых поездок
      const oneTimeTravels = travels.filter(travel => {
        const travelDate = new Date(travel.date_departure);
        return (
          !travel.isDaily &&
          travelDate >= new Date(startDate) &&
          travelDate <= endDate &&
          travel.fromEN === from &&
          travel.toEN === to
        );
      });

      oneTimeTravels.forEach(travel => {
        currentTravels.push(travel);
      });

      // Шаг 2: Фильтрация и добавление ежедневных поездок
      const dailyTravels = travels.filter(travel => {
        const travelCreationDate = new Date(travel.date_departure);
        return (
          travel.isDaily &&
          travelCreationDate >= dailyStartDate &&
          travelCreationDate <= endDate &&
          travel.fromEN === from &&
          travel.toEN === to
        );
      });

      let currentDate = new Date(startDate);

      while (currentTravels.length < 20 && currentDate <= endDate) {
        dailyTravels.forEach(travel => {
          if (currentTravels.length < 20) {
            currentTravels.push({
              ...travel,
              date_departure: currentDate.toISOString()  // Устанавливаем текущую дату для ежедневного билета
            });
          }
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Сортировка поездок по дате и времени отправления
      currentTravels.sort((a, b) => new Date(a.date_departure) - new Date(b.date_departure));
      console.log('Отсортированные поездки:', currentTravels);

      // Обрезаем массив до 20 поездок
      const finalTravels = currentTravels.slice(0, 20);
      console.log('Итоговые поездки:', finalTravels);

      // Устанавливаем поездки и останавливаем загрузку
      setVisibleTravels(finalTravels);
      setIsLoading(false);

    } catch (error) {
      setError(error.message || 'Error fetching travels');
      console.error('Ошибка при загрузке поездок:', error);
      setIsLoading(false);
    }
  }, [from, to, startDate, endDate, dailyStartDate]);

  useEffect(() => {
    loadTravels();
  }, [loadTravels]);

  const formatDate = (dateString) => {
    const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('uk-UA', options);
  };

  if (error) {
    return <div>{error}</div>;
  }

  return (
    <div className='SearchTickets'>
      <Helmet>
        <title>{t('titles.search')}</title>
      </Helmet>
      {isLoading ? (
        <div>{t('Loading...')}</div>
      ) : (
        visibleTravels.length > 0 ? (
          <>
            {Object.keys(groupedTravels(visibleTravels)).map(date => (
              <div key={date} className="date-section">
                <h2>{t('Travels_on')}: {formatDate(date)}</h2>
                {groupedTravels(visibleTravels)[date].map((travel, index) => (
                  <Ticket key={index} travel={travel} passengers={passengers} />
                ))}
              </div>
            ))}
          </>
        ) : (
          <div>{t('No tickets found')}</div>
        )
      )}
    </div>
  );
}

// Функция для группировки видимых билетов по дате
const groupedTravels = (travels) => {
  return travels.reduce((acc, travel) => {
    const dateKey = travel.date_departure.split('T')[0];
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(travel);
    return acc;
  }, {});
};

export default SearchTickets;
