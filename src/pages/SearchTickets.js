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

  console.log('Передані параметри:', { from, to, startDate, passengers });

  const [visibleTravels, setVisibleTravels] = useState([]);  // Масив для збереження видимих квитків
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Максимальна дата пошуку (20 днів вперед від startDate)
  const endDate = useMemo(() => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + 20);  // +20 днів до дати старту
    return date;
  }, [startDate]);

  // Функція для розрахунку дати прибуття
  const calculateArrivalDate = (departureDate, duration) => {
    const arrivalDate = new Date(departureDate);
    arrivalDate.setHours(arrivalDate.getHours() + duration);
    return arrivalDate.toISOString();
  };

  // Функція для завантаження подорожей
  const loadTravels = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('Початок завантаження подорожей...');

      const response = await axios.get('https://bus-travel-release-7e3983a29e39.herokuapp.com/api/flights/', {
        params: { from, to }
      });

      console.log('Відповідь від сервера:', response.data);
      const travels = response.data;

      if (travels.length === 0) {
        console.log('Подорожі не знайдено');
        setVisibleTravels([]);
        setIsLoading(false);
        return;
      }

      let displayedTravels = [];
      let currentDate = new Date(startDate);

      while (displayedTravels.length < 20 && currentDate <= endDate) {
        travels.forEach(travel => {
          // Фільтруємо по містам відправлення і прибуття
          if (
            travel.fromEN.trim().toLowerCase() === from.trim().toLowerCase() &&
            travel.toEN.trim().toLowerCase() === to.trim().toLowerCase()
          ) {
            // Розраховуємо нову дату відправлення і прибуття
            const departureDate = currentDate.toISOString();
            const arrivalDate = calculateArrivalDate(departureDate, travel.duration);

            // Додаємо подорож з новими датами
            displayedTravels.push({
              ...travel,
              date_departure: departureDate,  // Задаємо нову дату відправлення
              date_arrival: arrivalDate       // Розрахована дата прибуття
            });

            console.log('Додано подорож на дату:', departureDate);
          }
        });
        currentDate.setDate(currentDate.getDate() + 1);  // Перехід до наступного дня
      }

      // Лог перед сортуванням
      console.log('Масив подорожей перед сортуванням:', displayedTravels);

      // Сортування подорожей за датою відправлення
      displayedTravels.sort((a, b) => new Date(a.date_departure) - new Date(b.date_departure));
      
      // Лог після сортування
      console.log('Відсортовані подорожі:', displayedTravels);

      // Обрізаємо масив до 20 подорожей
      const finalTravels = displayedTravels.slice(0, 20);
      console.log('Фінальні подорожі:', finalTravels);

      // Встановлюємо подорожі та зупиняємо завантаження
      setVisibleTravels(finalTravels);
      setIsLoading(false);

    } catch (error) {
      setError(error.message || 'Помилка завантаження подорожей');
      console.error('Помилка завантаження подорожей:', error);
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

// Функція для групування подорожей за датами
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
