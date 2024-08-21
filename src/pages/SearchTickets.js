import React, { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import '../stylesheets/SearchTickets.css';
import Ticket from '../components/Ticket';
import axios from 'axios';
import { Helmet } from 'react-helmet-async';
import moment from 'moment';

function SearchTickets() {
  const { t } = useTranslation();
  const location = useLocation();
  const { from, to, startDate, passengers } = location.state || {};

  const [activeTrips, setActiveTrips] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const now = moment();

  // Проверяем, активна ли поездка (для фильтрации)
  const isTripActive = useCallback((trip) => {
    const tripArrivalDateTime = moment(trip.date_arrival).add(2, 'hours');
    return now.isBefore(tripArrivalDateTime);
  }, [now]);

  const fetchTrips = useCallback(async () => {
    try {
      if (!from || !to || !startDate) {
        throw new Error('Missing search parameters');
      }

      console.log('Sending request to API with params:', { from, to, startDate });
      const response = await axios.get('https://bus-travel-release-7e3983a29e39.herokuapp.com/api/flights/', {
        params: { from, to, startDate }
      });

      const trips = response.data;
      console.log('Fetched trips:', trips);

      if (!Array.isArray(trips)) {
        throw new Error('Invalid data format received from API');
      }

      const active = trips
        .filter(trip => isTripActive(trip))
        .sort((a, b) => {
          return moment(a.date_departure) - moment(b.date_departure);
        });

      setActiveTrips(active);
    } catch (error) {
      setError(error.message || 'Error fetching trips');
      console.error('Error fetching trips:', error);
    } finally {
      setIsLoading(false);
    }
  }, [from, to, startDate, isTripActive]);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  const formatDate = (dateString) => {
    const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('uk-UA', options);
  };

  if (isLoading) {
    return <div>{t('Loading...')}</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  return (
    <div className='SearchTickets'>
      <Helmet>
        <title>{t('titles.search')}</title>
      </Helmet>
      {activeTrips.length === 0 ? (
        <div>{t('No tickets found')}</div>
      ) : (
        activeTrips.map((trip, index) => (
          <div key={index} className='Trip'>
            <div className='Date'>
              <span>{formatDate(trip.date_departure)}</span>
            </div>
            <div className='Downpart'>
              <div className='MainInfo'>
                <div className='Time'>
                  <div className='TimeDep'>
                    <span>{trip.departure}</span>
                  </div>
                  <div className='TimeArr'>
                    <span>{trip.arrival}</span>
                  </div>
                </div>
                <div className='RouteSymbol'>
                  <div className='Line'></div>
                  <div className='Circle top'></div>
                  <div className='Circle bottom'></div>
                </div>
                <div className='Route'>
                  <div className='From'>
                    <div className='Place'>
                      <span>{trip.from}</span>
                      <span>{trip.fromLocation}</span>
                    </div>
                  </div>
                  <div className='To'>
                    <div className='Place'>
                      <span>{trip.to}</span>
                      <span>{trip.toLocation}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className='AdditionalInfo'>
                <span>{t('Baggage')}: {trip.baggage === "yes" ? t('Yes') : t('No')}</span>
                <span>{t('Passengers')}: {passengers}</span>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default SearchTickets;
