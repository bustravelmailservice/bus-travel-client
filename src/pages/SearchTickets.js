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

  const [visibleTravels, setVisibleTravels] = useState([]);  // Хранит видимые билеты
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastDate, setLastDate] = useState(new Date(startDate));  // Последняя дата, до которой мы подгрузили билеты
  const [allTravelsLoaded, setAllTravelsLoaded] = useState(false);  // Индикатор того, что все билеты загружены

  useEffect(() => {
    console.log('Received search parameters:', { from, to, startDate, passengers });
    loadMoreTravels();  // Начать загрузку сразу после загрузки компонента
  }, [from, to, startDate, passengers]);

  const loadMoreTravels = async () => {
    if (allTravelsLoaded || !from || !to || !startDate) return;

    try {
      setIsLoading(true);
      const response = await axios.get('https://bus-travel-release-7e3983a29e39.herokuapp.com/api/flights/', {
        params: { from, to }
      });

      const travels = response.data;
      console.log('Fetched travels:', travels);

      if (travels.length === 0) {
        setAllTravelsLoaded(true);  // Если нет билетов, заканчиваем загрузку
        return;
      }

      let currentTravels = [...visibleTravels];  // Копия текущих видимых билетов
      let currentDate = new Date(lastDate);  // Начальная дата для поиска
      let count = 0;

      while (count < 20 && currentDate <= new Date(startDate)) {
        for (let travel of travels) {
          const travelDate = new Date(travel.date_departure);

          // Если дата совпадает с текущей датой и маршрут совпадает
          if (travelDate.toDateString() === currentDate.toDateString()) {
            if (!travel.isDaily || !currentTravels.some(t => t.date_departure === travel.date_departure)) {
              currentTravels.push(travel);
              count++;
            }
          }

          // Если поездка ежедневная и маршрут совпадает
          if (travel.isDaily && !currentTravels.some(t => t.date_departure === travelDate.toISOString())) {
            let dailyDate = new Date(travelDate);
            while (count < 20 && dailyDate >= currentDate) {
              if (!currentTravels.some(t => t.date_departure === dailyDate.toISOString())) {
                currentTravels.push({
                  ...travel,
                  date_departure: dailyDate.toISOString()
                });
                count++;
              }
              dailyDate.setDate(dailyDate.getDate() + 1);
            }
          }

          // Если достигли лимита, выходим из цикла
          if (count >= 20) break;
        }

        // Переходим к следующему дню
        currentDate.setDate(currentDate.getDate() + 1);
      }

      setVisibleTravels(currentTravels);
      setLastDate(currentDate);  // Обновляем последнюю обработанную дату

      if (currentTravels.length >= travels.length) {
        setAllTravelsLoaded(true);  // Если все билеты загружены, прекращаем загрузку
      }
    } catch (error) {
      setError(error.message || 'Error fetching travels');
      console.error('Error fetching travels:', error);
    } finally {
      setIsLoading(false);
    }
  };

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
