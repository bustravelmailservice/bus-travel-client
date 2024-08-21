import React, { useEffect, useState, useCallback } from 'react';
import moment from 'moment';
import { useTranslation } from 'react-i18next';
import '../stylesheets/Travels.css';
import SadSmile from '../images/sad_smile.png';
import axios from 'axios';
import { Helmet } from 'react-helmet-async';

const getCityNameById = (id, language, cities) => {
  const city = cities.find(city => city.id === id);
  return city ? (language === 'ua' ? city.ukrainian : city.value) : '';
};

function Travels() {
  const { t, i18n } = useTranslation();
  const now = moment();
  const [trips, setTrips] = useState([]);
  const [cities, setCities] = useState([]);
  const [isLoadingTrips, setIsLoadingTrips] = useState(true);
  const [error, setError] = useState(null);

  const isTripActive = useCallback((trip) => {
    const tripArrivalDateTime = moment(trip.date_arrival).add(2, 'hours');
    return now.isBefore(tripArrivalDateTime) && trip.isActive === 'активний';
  }, [now]);

  const fetchTrips = useCallback(async () => {
    try {
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        setError('User not authenticated');
        setIsLoadingTrips(false);
        return;
      }

      const response = await axios.get('https://bus-travel-release-7e3983a29e39.herokuapp.com/api/tickets/', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const trips = response.data;
      const activeTrips = trips.filter(isTripActive).sort((a, b) => {
        return moment(a.date_departure) - moment(b.date_departure);
      });

      setTrips(activeTrips);
    } catch (error) {
      setError('Error fetching trips');
      console.error('Error fetching trips:', error);
    } finally {
      setIsLoadingTrips(false);
    }
  }, [isTripActive]);

  useEffect(() => {
    const fetchCities = async () => {
      try {
        const response = await axios.get('https://bus-travel-release-7e3983a29e39.herokuapp.com/api/cities');
        setCities(response.data);
      } catch (error) {
        console.error('Error fetching cities:', error);
      }
    };

    fetchCities();
    fetchTrips();
  }, [fetchTrips]);

  const formatDate = (dateString) => {
    const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('uk-UA', options);
  };

  const groupTripsByDate = (trips) => {
    return trips.reduce((groupedTrips, trip) => {
      const date = trip.date_departure.split('T')[0]; // Группировка по дате (без времени)
      if (!groupedTrips[date]) {
        groupedTrips[date] = [];
      }
      groupedTrips[date].push(trip);
      return groupedTrips;
    }, {});
  };

  const groupedTrips = groupTripsByDate(trips);

  const renderTrips = (groupedTrips) => {
    return Object.keys(groupedTrips).map((date, index) => (
      <div key={index} className='date-section'>
        <h2>{t('Travels_on')}: {formatDate(date)}</h2>
        {groupedTrips[date].map((trip, tripIndex) => (
          <div key={tripIndex} className='TripContainer'>
            <div className='TripTravels'>
              <div className='MainInfoTravels'>
                <div className='TimeTravels'>
                  <div className='TimeDepTravels'>
                    <span>{trip.departure}</span>
                  </div>
                  <div className='TimeArrTravels'>
                    <span>{trip.arrival}</span>
                  </div>
                </div>
                <div className='RouteSymbolTravels'>
                  <div className='Line'></div>
                  <div className='Circle top'></div>
                  <div className='Circle bottom'></div>
                </div>
                <div className='RouteTravels'>
                  <div className='FromTravels'>
                    <div className='PlaceTravels'>
                      <span>{getCityNameById(trip.from, i18n.language, cities)}</span>
                      <span>{trip.fromLocation}</span>
                    </div>
                  </div>
                  <div className='ToTravels'>
                    <div className='PlaceTravels'>
                      <span>{getCityNameById(trip.to, i18n.language, cities)}</span>
                      <span>{trip.toLocation}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className='AdditionalInfoTravels'>
                <span>{t('Baggage')}: {trip.baggage.smallBaggage} кг, {trip.baggage.largeBaggage} кг</span>
                <span>{t('Passengers')}: {trip.passengers}</span>
                <span>{t('Price')}: {trip.priceUA} грн</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    ));
  };

  if (isLoadingTrips) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  return (
    <div className='Travels'>
      <Helmet>
        <title>{t('titles.travels')}</title>
      </Helmet>
      <div className='Welcome'><span>{t('WelcomeTravel')}</span></div>
      <div className='FutureTravels FutureTravelsPage'>
        <div className='Information'><span>{t('InformationTravels')}</span></div>
        <div className='UserTravels'>
          {Object.keys(groupedTrips).length > 0 ? (
            <div className='HaveTravels'>
              {renderTrips(groupedTrips)}
            </div>
          ) : (
            <div className='DontHaveTravels'>
              <div className='SadSmile'><img src={SadSmile} alt='Sad smile' /></div>
              <div className='InfoHaveNotTravels'><span>{t('InfoHaveNotTravels')}</span></div>
              <div className='ProposeBuyTicket'><span>{t('ProposeBuyTicket')}</span></div>
              <a href='/map' className='ButtonBuyTickets'><span>{t('BuyTickets')}</span></a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Travels;
