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

  const [visibleTravels, setVisibleTravels] = useState([]);  // Хранит видимые билеты
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastDate, setLastDate] = useState(new Date(startDate));  // Последняя дата, до которой мы подгрузили билеты
  const [allTravelsLoaded, setAllTravelsLoaded] = useState(false);  // Индикатор того, что все билеты загружены

  // Максимальная дата поиска (30 дней вперед от startDate), завернутая в useMemo
  const maxDate = useMemo(() => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + 30);
    return date;
  }, [startDate]);

  // Используем useCallback для фиксации функции
  const loadMoreTravels = useCallback(async () => {
    if (allTravelsLoaded || !from || !to || !startDate || lastDate > maxDate) return;

    try {
      setIsLoading(true);
      const response = await axios.get('https://bus-travel-release-7e3983a29e39.herokuapp.com/api/flights/', {
        params: { from, to }
      });

      const travels = response.data;
      console.log('Fetched travels:', travels);

      // Если нет билетов, сразу показываем сообщение и заканчиваем загрузку
      if (travels.length === 0) {
        setAllTravelsLoaded(true);  // Завершаем загрузку, так как билетов нет
        setVisibleTravels([]);  // Очищаем видимые билеты
        setIsLoading(false);  // Останавливаем загрузку
        return;
      }

      let currentTravels = [...visibleTravels];  // Копия текущих видимых билетов
      let currentDate = new Date(lastDate);  // Начальная дата для поиска
      let count = 0;

      while (count < 20 && currentDate <= maxDate) {
        // Проверяем одноразовые билеты на текущую дату
        const oneTimeTravels = travels.filter(travel => {
          const travelDate = new Date(travel.date_departure);
          return (
            travelDate.toDateString() === currentDate.toDateString() &&
            !travel.isDaily &&
            travel.fromEN === from &&
            travel.toEN === to
          );
        });

        // Добавляем одноразовые билеты
        for (let travel of oneTimeTravels) {
          currentTravels.push(travel);
          count++;
          if (count >= 20) break;  // Если достигли лимита, выходим из цикла
        }

        // Прерываем цикл, если одноразовый билет уже добавлен
        if (oneTimeTravels.length > 0 && count >= 20) {
          break;
        }

        // Проверяем ежедневные билеты на текущую дату
        const dailyTravels = travels.filter(travel => {
          const travelDate = new Date(travel.date_departure);
          return (
            travel.isDaily &&
            travel.fromEN === from &&
            travel.toEN === to &&
            travelDate <= currentDate
          );
        });

        // Добавляем ежедневные билеты
        for (let travel of dailyTravels) {
          if (!currentTravels.some(t => t.date_departure === travel.date_departure)) {
            currentTravels.push({
              ...travel,
              date_departure: currentDate.toISOString()  // Устанавливаем текущую дату для ежедневного билета
            });
            count++;
            if (count >= 20) break;  // Если достигли лимита, выходим из цикла
          }
        }

        // Переходим к следующему дню
        currentDate.setDate(currentDate.getDate() + 1);

        // Если текущая дата превышает лимит в 30 дней, завершаем поиск
        if (currentDate > maxDate) {
          setAllTravelsLoaded(true);
          break;
        }
      }

      setVisibleTravels(currentTravels);
      setLastDate(currentDate);  // Обновляем последнюю обработанную дату

      // Проверяем, все ли билеты загружены
      if (currentTravels.length >= travels.length || currentDate > maxDate) {
        setAllTravelsLoaded(true);
      }
    } catch (error) {
      setError(error.message || 'Error fetching travels');
      console.error('Error fetching travels:', error);
    } finally {
      setIsLoading(false);
    }
  }, [allTravelsLoaded, from, to, startDate, lastDate, visibleTravels, maxDate]);

  useEffect(() => {
    console.log('Received search parameters:', { from, to, startDate, passengers });
    loadMoreTravels();  // Начать загрузку сразу после загрузки компонента
  }, [from, to, startDate, passengers, loadMoreTravels]);  // Добавляем loadMoreTravels в зависимости

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
            {!allTravelsLoaded && (
              <button onClick={loadMoreTravels} className="load-more-button">
                {t('Load more tickets')}
              </button>
            )}
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
