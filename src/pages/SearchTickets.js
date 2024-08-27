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

  const [visibleTravels, setVisibleTravels] = useState([]);  // Хранит видимые билеты
  const [dailyTravels, setDailyTravels] = useState([]);  // Хранит ежедневные билеты для дальнейшего использования
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadTravels = useCallback(async () => {
    if (!from || !to || !startDate) return;

    try {
      setIsLoading(true);
      const response = await axios.get('https://bus-travel-release-7e3983a29e39.herokuapp.com/api/flights/', {
        params: { from, to }
      });

      const travels = response.data;
      console.log('Fetched travels:', travels);

      const filteredOneTimeTravels = travels.filter(travel => {
        const travelDate = new Date(travel.date_departure);
        return (
          !travel.isDaily &&
          travelDate >= new Date(startDate) &&
          travel.fromEN === from &&
          travel.toEN === to
        );
      });

      const filteredDailyTravels = travels.filter(travel => {
        const travelDate = new Date(travel.date_departure);
        return (
          travel.isDaily &&
          travelDate >= new Date('2024-06-01') &&  // Загружаем все ежедневные поездки начиная с 01.06.2024
          travel.fromEN === from &&
          travel.toEN === to
        );
      });

      // Сохраняем ежедневные поездки для последующего использования
      setDailyTravels(filteredDailyTravels);

      // Объединяем одноразовые поездки и ежедневные поездки, начиная с даты startDate
      const combinedTravels = [];

      // Добавляем одноразовые поездки, если их дата совпадает или позже startDate
      combinedTravels.push(...filteredOneTimeTravels);

      // Добавляем ежедневные поездки, начиная с даты startDate
      filteredDailyTravels.forEach(travel => {
        let currentDate = new Date(startDate);
        while (currentDate <= new Date(travel.date_departure)) {
          combinedTravels.push({
            ...travel,
            date_departure: currentDate.toISOString() // Устанавливаем текущую дату для ежедневного билета
          });
          currentDate.setDate(currentDate.getDate() + 1);  // Переход к следующему дню
        }
      });

      // Сортируем поездки по дате отправления
      combinedTravels.sort((a, b) => new Date(a.date_departure) - new Date(b.date_departure));

      setVisibleTravels(combinedTravels.slice(0, 20)); // Ограничиваем результат первыми 20 поездками

      if (combinedTravels.length === 0) {
        setError(t('No tickets found'));
      }
    } catch (error) {
      setError(error.message || 'Error fetching travels');
      console.error('Error fetching travels:', error);
    } finally {
      setIsLoading(false);
    }
  }, [from, to, startDate, t]);

  useEffect(() => {
    console.log('Received search parameters:', { from, to, startDate, passengers });
    loadTravels(); // Начать загрузку сразу после загрузки компонента
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
