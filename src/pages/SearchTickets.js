import React, { useEffect, useState } from 'react';
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

  const [groupedTravels, setGroupedTravels] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Логируем полученные параметры поиска
    console.log('Received search parameters:', { from, to, startDate, passengers });
  }, [from, to, startDate, passengers]);

  useEffect(() => {
    const fetchTravels = async () => {
      try {
        // Проверяем наличие обязательных параметров
        if (!from || !to || !startDate) {
          throw new Error('Missing search parameters');
        }

        // Запрос к API с логированием запроса и ответа
        console.log('Sending request to API with params:', { from, to, startDate });
        const response = await axios.get('https://bus-travel-release-7e3983a29e39.herokuapp.com/api/flights/', {
          params: { from, to, startDate }
        });

        // Логируем ответ от сервера
        const travels = response.data;
        console.log('Fetched travels:', travels);

        if (!Array.isArray(travels)) {
          throw new Error('Invalid data format received from API');
        }

        // Преобразуем дату поиска для фильтрации
        const searchStartDate = new Date(startDate);

        // Фильтруем поездки
        const filteredTravels = travels.filter(travel => {
          const travelDate = new Date(travel.date_departure);
          return travelDate >= searchStartDate && travel.fromEN === from && travel.toEN === to;
        });

        // Логируем отфильтрованные данные
        console.log('Filtered travels:', filteredTravels);

        // Сортировка поездок по дате и времени отправления
        filteredTravels.sort((a, b) => {
          const dateA = new Date(a.date_departure);
          const dateB = new Date(b.date_departure);
          const timeA = a.departure.split(':').map(Number);
          const timeB = b.departure.split(':').map(Number);

          dateA.setHours(timeA[0], timeA[1]);
          dateB.setHours(timeB[0], timeB[1]);

          return dateA - dateB;
        });

        // Логируем отсортированные данные
        console.log('Sorted travels:', filteredTravels);

        // Группировка поездок по дате
        const grouped = filteredTravels.reduce((acc, travel) => {
          const dateKey = travel.date_departure.split('T')[0];
          if (!acc[dateKey]) {
            acc[dateKey] = [];
          }
          acc[dateKey].push(travel);
          return acc;
        }, {});

        // Логируем сгруппированные данные
        console.log('Grouped travels:', grouped);

        // Устанавливаем состояние с сгруппированными данными
        setGroupedTravels(grouped);
      } catch (error) {
        // Логируем ошибку
        setError(error.message || 'Error fetching travels');
        console.error('Error fetching travels:', error);
      } finally {
        // Отключаем состояние загрузки
        setIsLoading(false);
      }
    };

    // Вызываем функцию загрузки данных
    fetchTravels();
  }, [from, to, startDate]);

  // Функция для форматирования даты
  const formatDate = (dateString) => {
    const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('uk-UA', options);
  };

  // Если произошла ошибка - отображаем её
  if (error) {
    return <div>{error}</div>;
  }

  // Рендеринг компонента
  return (
    <div className='SearchTickets'>
      <Helmet>
        <title>{t('titles.search')}</title>
      </Helmet>
      {isLoading ? (
        <div>{t('Loading...')}</div>
      ) : (
        Object.keys(groupedTravels).length > 0 ? (
          Object.keys(groupedTravels).map(date => (
            <div key={date} className="date-section">
              <h2>{t('Travels_on')}: {formatDate(date)}</h2>
              {groupedTravels[date].map((travel, index) => (
                <Ticket key={index} travel={travel} passengers={passengers} />
              ))}
            </div>
          ))
        ) : (
          <div>{t('No tickets found')}</div>
        )
      )}
    </div>
  );
}

export default SearchTickets;
