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

      let foundTravels = [];
      let currentDate = new Date(startDate);  // Начинаем с даты, которую указал пользователь

      // Фильтрация одноразовых поездок, которые начинаются с текущей даты или позже
      const filteredOneTimeTravels = travels.filter(travel => {
        const travelDate = new Date(travel.date_departure);
        return (
          !travel.isDaily &&
          travelDate >= currentDate &&
          travel.fromEN === from &&
          travel.toEN === to
        );
      });

      // Добавляем одноразовые поездки в foundTravels
      foundTravels.push(...filteredOneTimeTravels);

      // Фильтрация ежедневных поездок, которые начинаются с 01.06.2024
      const filteredDailyTravels = travels.filter(travel => {
        const travelDate = new Date(travel.date_departure);
        return (
          travel.isDaily &&
          travelDate >= new Date('2024-06-01') &&
          travel.fromEN === from &&
          travel.toEN === to
        );
      });

      // Добавляем ежедневные поездки, начиная с даты пользователя
      while (foundTravels.length < 20) {
        // Добавляем ежедневные поездки, если они активны с currentDate
        filteredDailyTravels.forEach(travel => {
          if (foundTravels.length < 20) {
            foundTravels.push({
              ...travel,
              date_departure: currentDate.toISOString()  // Устанавливаем текущую дату для ежедневного билета
            });
          }
        });

        // Увеличиваем дату на один день
        currentDate.setDate(currentDate.getDate() + 1);

        // Если текущая дата уже после всех одноразовых и ежедневных поездок, выходим из цикла
        if (filteredOneTimeTravels.length === 0 && filteredDailyTravels.length === 0) {
          break;
        }
      }

      // Сортируем поездки по дате и времени отправления
      foundTravels.sort((a, b) => {
        const dateA = new Date(a.date_departure);
        const dateB = new Date(b.date_departure);
        return dateA - dateB;  // Сортировка по дате
      });

      setVisibleTravels(foundTravels.slice(0, 20)); // Ограничиваем результат первыми 20 поездками

      if (foundTravels.length === 0) {
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
