import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import '../stylesheets/SearchTickets.css';
import Ticket from '../components/Ticket';
import axios from 'axios';
import { Helmet } from 'react-helmet-async';

function SearchTickets() {
  const { t } = useTranslation();  // Удалили 'i18n' за ненадобностью
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

  // Удалено dailyStartDate

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

      let oneTimeTravelsArray = [];
      let dailyTravelsArray = [];

      // Шаг 1: Фильтрация одноразовых поездок
      const oneTimeTravels = travels.filter(travel => {
        const travelDate = new Date(travel.date_departure);
        const isMatch = (
          !travel.isDaily &&
          travelDate >= new Date(startDate) &&
          travelDate <= endDate &&
          travel.fromEN.trim().toLowerCase() === from.trim().toLowerCase() &&
          travel.toEN.trim().toLowerCase() === to.trim().toLowerCase()
        );
        console.log('Проверка одноразовой поездки:', travel, 'Результат:', isMatch);
        return isMatch;
      });

      console.log('Отфильтрованные одноразовые поездки:', oneTimeTravels);

      oneTimeTravels.forEach(travel => {
        oneTimeTravelsArray.push(travel);
      });

      // Шаг 2: Фильтрация и добавление ежедневных поездок
      const dailyTravels = travels.filter(travel => {
        const travelCreationDate = new Date(travel.date_departure);
        const isMatch = (
          travel.isDaily &&
          travelCreationDate <= endDate &&
          travel.fromEN.trim().toLowerCase() === from.trim().toLowerCase() &&
          travel.toEN.trim().toLowerCase() === to.trim().toLowerCase()
        );
        console.log('Проверка ежедневной поездки:', travel, 'Результат:', isMatch);
        return isMatch;
      });

      console.log('Отфильтрованные ежедневные поездки:', dailyTravels);

      let currentDate = new Date(startDate);

      while (dailyTravelsArray.length < 20 && currentDate <= endDate) {
        dailyTravels.forEach(travel => {
          const travelDepartureDate = new Date(travel.date_departure);

          if (currentDate >= travelDepartureDate && dailyTravelsArray.length < 20) {
            // Вычисляем фактическую дату отправления, учитывая разницу между startDate и date_departure
            const actualDepartureDate = new Date(travelDepartureDate);
            actualDepartureDate.setDate(actualDepartureDate.getDate() + (currentDate - new Date(startDate)) / (1000 * 60 * 60 * 24));

            dailyTravelsArray.push({
              ...travel,
              date_departure: actualDepartureDate.toISOString()  // Устанавливаем вычисленную дату отправления
            });
            console.log('Добавлена ежедневная поездка на дату:', actualDepartureDate.toISOString());
          }
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Логирование перед сортировкой
      console.log('Массив одноразовых поездок:', oneTimeTravelsArray);
      console.log('Массив ежедневных поездок:', dailyTravelsArray);

      // Объединение массивов и сортировка
      const combinedTravels = [...oneTimeTravelsArray, ...dailyTravelsArray];

      // Сортировка поездок по дате и времени отправления
      combinedTravels.sort((a, b) => new Date(a.date_departure) - new Date(b.date_departure));

      // Логирование после сортировки
      console.log('Объединенные и отсортированные поездки:', combinedTravels);

      // Обрезаем массив до 20 поездок
      const finalTravels = combinedTravels.slice(0, 20);
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
