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

  // Рассчитываем максимальную дату поиска: дата пользователя + 2 месяца
  const maxDate = useMemo(() => {
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + 2);  // Добавляем 2 месяца
    return date;
  }, [startDate]);

  const loadTravels = useCallback(async () => {
    if (!from || !to || !startDate) return;

    try {
      console.log('Начало загрузки поездок');
      setIsLoading(true);

      const response = await axios.get('https://bus-travel-release-7e3983a29e39.herokuapp.com/api/flights/', {
        params: { from, to }
      });

      const travels = response.data;
      console.log('Полученные поездки:', travels);

      let foundTravels = [];
      let currentDate = new Date(startDate);  // Начинаем с даты, которую указал пользователь

      // Фильтрация одноразовых поездок, которые начинаются с текущей даты и не позже maxDate
      const filteredOneTimeTravels = travels.filter(travel => {
        const travelDate = new Date(travel.date_departure);
        return (
          !travel.isDaily &&
          travelDate >= currentDate &&
          travelDate <= maxDate &&  // Ограничение по maxDate
          travel.fromEN === from &&
          travel.toEN === to
        );
      });
      console.log('Фильтрованные одноразовые поездки:', filteredOneTimeTravels);

      // Добавляем одноразовые поездки в foundTravels
      foundTravels.push(...filteredOneTimeTravels);
      console.log('Добавлены одноразовые поездки в foundTravels:', foundTravels);

      // Фильтрация ежедневных поездок, которые активны с 01.06.2024 и не позже maxDate
      const filteredDailyTravels = travels.filter(travel => {
        const travelDate = new Date(travel.date_departure);
        return (
          travel.isDaily &&
          travelDate <= currentDate &&  // Проверяем, что поездка была активна на дату currentDate или ранее
          travelDate <= maxDate &&  // Ограничение по maxDate
          travel.fromEN === from &&
          travel.toEN === to
        );
      });
      console.log('Фильтрованные ежедневные поездки:', filteredDailyTravels);

      // Добавляем ежедневные поездки, начиная с даты пользователя, но не позже maxDate
      while (foundTravels.length < 20 && currentDate <= maxDate) {
        // Добавляем ежедневные поездки, если они активны на currentDate
        filteredDailyTravels.forEach(travel => {
          if (foundTravels.length < 20 && currentDate <= maxDate) {
            foundTravels.push({
              ...travel,
              date_departure: currentDate.toISOString()  // Устанавливаем текущую дату для ежедневного билета
            });
            console.log(`Добавлена ежедневная поездка на ${currentDate.toISOString()}:`, travel);
          }
        });

        // Увеличиваем дату на один день
        currentDate.setDate(currentDate.getDate() + 1);
        console.log('Текущая дата увеличена на один день:', currentDate);

        // Если больше нет одноразовых поездок и ежедневных поездок, выходим из цикла
        if (filteredOneTimeTravels.length === 0 && filteredDailyTravels.length === 0) {
          console.log('Нет больше одноразовых или ежедневных поездок. Остановка.');
          break;
        }
      }

      // Сортируем поездки по дате и времени отправления
      foundTravels.sort((a, b) => {
        const dateA = new Date(a.date_departure);
        const dateB = new Date(b.date_departure);
        return dateA - dateB;  // Сортировка по дате
      });
      console.log('Отсортированные поездки:', foundTravels);

      setVisibleTravels(foundTravels.slice(0, 20)); // Ограничиваем результат первыми 20 поездками
      console.log('Итоговые видимые поездки:', foundTravels.slice(0, 20));

      if (foundTravels.length === 0) {
        setError(t('No tickets found'));
      }
    } catch (error) {
      setError(error.message || 'Error fetching travels');
      console.error('Ошибка при загрузке поездок:', error);
    } finally {
      setIsLoading(false);
      console.log('Загрузка поездок завершена.');
    }
  }, [from, to, startDate, maxDate, t]);

  useEffect(() => {
    console.log('Получены параметры поиска:', { from, to, startDate, passengers });
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
