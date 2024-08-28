import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
/* import { useTranslation } from 'react-i18next'; */
import '../stylesheets/SearchTickets.css';
import Ticket from '../components/Ticket';
import axios from 'axios';
import { Helmet } from 'react-helmet-async';

function SearchTickets() {
  /* const { t } = useTranslation(); */
  const location = useLocation();
  const { from, to, startDate, passengers } = location.state || {};

  console.log('Переданные параметры из компонента Picking:', { from, to, startDate, passengers });

  const [visibleTravels, setVisibleTravels] = useState([]);  // Хранит видимые билеты
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Максимальная дата поиска (2 месяца вперед от startDate)
  const maxDate = useMemo(() => {
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + 2);  // +2 месяца к startDate
    return date;
  }, [startDate]);

  const addDailyTravels = useCallback((travels, currentTravels, currentDate, maxDate) => {
    console.log('Добавляем ежедневные поездки:', travels, 'Текущая дата:', currentDate, 'Максимальная дата:', maxDate);
    while (currentTravels.length < 20 && currentDate <= maxDate) {
      travels.forEach(travel => {
        if (currentTravels.length < 20) {
          currentTravels.push({
            ...travel,
            date_departure: currentDate.toISOString()  // Устанавливаем текущую дату для ежедневного билета
          });
        }
      });
      currentDate.setDate(currentDate.getDate() + 1);

      if (currentTravels.length >= 20) {
        break;
      }
    }
    console.log('Текущие поездки после добавления ежедневных:', currentTravels);
    return currentTravels;
  }, []);

  const addOneTimeTravels = useCallback((travels, currentTravels, currentDate, maxDate) => {
    console.log('Добавляем одноразовые поездки:', travels, 'Текущая дата:', currentDate, 'Максимальная дата:', maxDate);
    while (currentTravels.length < 20 && currentDate <= maxDate) {
      const filteredTravels = travels.filter(travel => {
        const travelDate = new Date(travel.date_departure);
        return (
          travelDate.toDateString() === currentDate.toDateString() &&
          !travel.isDaily &&
          travel.fromEN === from &&
          travel.toEN === to
        );
      });

      filteredTravels.forEach(travel => {
        if (currentTravels.length < 20) {
          currentTravels.push(travel);
        }
      });

      currentDate.setDate(currentDate.getDate() + 1);

      if (currentTravels.length >= 20) {
        break;
      }
    }
    console.log('Текущие поездки после добавления одноразовых:', currentTravels);
    return currentTravels;
  }, [from, to]);

  // Функция для загрузки поездок
  const loadMoreTravels = useCallback(async () => {
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

      let currentDate = new Date(startDate);
      let currentTravels = [];

      // Шаг 1: Фильтрация ежедневных поездок в нужном периоде
      const dailyTravels = travels.filter(travel => {
        const travelCreationDate = new Date(travel.date_departure);
        return (
          travel.isDaily &&
          travel.fromEN === from &&
          travel.toEN === to &&
          travelCreationDate >= new Date('2024-06-01') &&  // Начальная дата фильтрации ежедневных поездок
          travelCreationDate <= maxDate
        );
      });

      console.log('Ежедневные поездки после фильтрации:', dailyTravels);

      // Добавление ежедневных поездок
      currentTravels = addDailyTravels(dailyTravels, currentTravels, currentDate, maxDate);

      // Если уже набрано 20 поездок, прекращаем добавление одноразовых поездок
      if (currentTravels.length < 20) {
        // Шаг 2: Добавление одноразовых поездок
        currentTravels = addOneTimeTravels(travels, currentTravels, currentDate, maxDate);
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
  }, [from, to, startDate, maxDate, addDailyTravels, addOneTimeTravels]);

  useEffect(() => {
    loadMoreTravels();
  }, [loadMoreTravels]);

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
        <title>titles.search</title>
      </Helmet>
      {isLoading ? (
        <div>Loading...</div>
      ) : (
        visibleTravels.length > 0 ? (
          <>
            {Object.keys(groupedTravels(visibleTravels)).map(date => (
              <div key={date} className="date-section">
                <h2>Travels_on: {formatDate(date)}</h2>
                {groupedTravels(visibleTravels)[date].map((travel, index) => (
                  <Ticket key={index} travel={travel} passengers={passengers} />
                ))}
              </div>
            ))}
          </>
        ) : (
          <div>No tickets found</div>
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
