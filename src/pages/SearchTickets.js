import React, { useEffect, useState, useCallback } from 'react';
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

  const [visibleTravels, setVisibleTravels] = useState([]);  // Хранит видимые поездки
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Фиксированная дата начала поиска - 01.06.2024
  const initialDate = new Date('2024-06-01');
  const maxTravels = 20;

  // Используем useCallback для фиксации функции
  const loadTravels = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await axios.get('https://bus-travel-release-7e3983a29e39.herokuapp.com/api/flights/', {
        params: { from, to }
      });

      const travels = response.data;
      console.log('Fetched travels:', travels);

      let currentTravels = [];
      let currentDate = new Date(initialDate);  // Начальная дата для поиска
      let count = 0;

      // Цикл для поиска поездок до заполнения массива на 20 поездок
      while (count < maxTravels) {
        // Добавляем все поездки на текущую дату
        const dailyTravels = travels.filter(travel => {
          const travelDate = new Date(travel.date_departure);
          return (
            (travelDate.toDateString() === currentDate.toDateString() || travel.isDaily) &&
            travel.fromEN === from &&
            travel.toEN === to
          );
        });

        for (let travel of dailyTravels) {
          currentTravels.push({
            ...travel,
            date_departure: currentDate.toISOString()  // Устанавливаем текущую дату для ежедневных поездок
          });
          count++;
          if (count >= maxTravels) break;  // Если достигли лимита, выходим из цикла
        }

        // Переходим к следующему дню
        currentDate.setDate(currentDate.getDate() + 1);
      }

      setVisibleTravels(currentTravels);
    } catch (error) {
      setError(error.message || 'Error fetching travels');
      console.error('Error fetching travels:', error);
    } finally {
      setIsLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    console.log('Received search parameters:', { from, to, startDate, passengers });
    loadTravels();  // Начать загрузку сразу после загрузки компонента
  }, [from, to, startDate, passengers, loadTravels]);

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
      {isLoading && visibleTravels.length === 0 ? (
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

// Функция для группировки поездок по дате
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
