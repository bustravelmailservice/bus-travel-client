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

      let displayedTravels = [];
      let currentDate = new Date(startDate);

      while (displayedTravels.length < 20 && currentDate <= endDate) {
        travels.forEach(travel => {
          // Вставляем поездку в каждый день от startDate до endDate
          displayedTravels.push({
            ...travel,
            date_departure: currentDate.toISOString()  // Устанавливаем текущую дату для поездки
          });
          console.log('Добавлена поездка на дату:', currentDate.toISOString());
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Логирование перед сортировкой
      console.log('Массив всех поездок:', displayedTravels);

      // Сортировка поездок по дате и времени отправления
      displayedTravels.sort((a, b) => new Date(a.date_departure) - new Date(b.date_departure));
      
      // Логирование после сортировки
      console.log('Отсортированные поездки:', displayedTravels);

      // Обрезаем массив до 20 поездок
      const finalTravels = displayedTravels.slice(0, 20);
      console.log('Итоговые поездки:', finalTravels);

      // Устанавливаем поездки и останавливаем загрузку
      setVisibleTravels(finalTravels);
      setIsLoading(false);

    } catch (error) {
      setError(error.message || 'Error fetching travels');
      console.error('Ошибка при загрузке поездок:', error);
      setIsLoading(false);
    }
  }, [from, to, startDate, endDate]);

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
