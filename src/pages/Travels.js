import React, { useContext, useState, useEffect, useCallback } from 'react';
import { Context } from '../';
import moment from 'moment';
import { useTranslation } from 'react-i18next';
import '../stylesheets/Travels.css';
import axios from 'axios';
import { Helmet } from 'react-helmet-async';

function Travels() {
  const { t } = useTranslation();
  const now = moment();
  const [showAllActiveTrips, setShowAllActiveTrips] = useState(false);
  const [activeTrips, setActiveTrips] = useState([]);
  const [isLoadingTrips, setIsLoadingTrips] = useState(true);
  const [error, setError] = useState(null);
  const { store } = useContext(Context);

  const isTripActive = useCallback((trip) => {
    const tripArrivalDateTime = moment(trip.date_arrival).add(2, 'hours');
    return now.isBefore(tripArrivalDateTime);
  }, [now]);

  const formatDate = (dateString) => {
    const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('uk-UA', options);
  };

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
      const active = trips
        .filter(trip => trip.isActive && isTripActive(trip))
        .sort((a, b) => {
          return moment(a.date_departure) - moment(b.date_departure);
        });

      setActiveTrips(active);
    } catch (error) {
      setError('Error fetching trips');
      console.error('Error fetching trips:', error);
    } finally {
      setIsLoadingTrips(false);
    }
  }, [isTripActive]);

  useEffect(() => {
    store.checkAuth().then(() => {
      fetchTrips();
    }).catch(err => {
      console.error('Error during checkAuth:', err);
      setError('Error during authentication');
    });
  }, [store, fetchTrips]);

  const groupTripsByDate = (trips) => {
    return trips.reduce((groupedTrips, trip) => {
      const date = trip.date_departure;
      if (!groupedTrips[date]) {
        groupedTrips[date] = [];
      }
      groupedTrips[date].push(trip);
      return groupedTrips;
    }, {});
  }

  const handleShowAllActiveTrips = () => {
    setShowAllActiveTrips(true);
  };

  const groupedActiveTrips = groupTripsByDate(activeTrips);

  const renderTrips = (groupedTrips, showAll) => {
    const tripsArray = Object.keys(groupedTrips).reduce((acc, date) => [...acc, ...groupedTrips[date]], []);
    const tripsToShow = showAll ? tripsArray : tripsArray.slice(0, 5);

    return tripsToShow.map((trip, index) => (
      <div key={index} className='Trip'>
        <div className='Date'>
          <span>{formatDate(trip.date_departure)}</span>
        </div>
        <div className='DownpartACC'>
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
              <div className='Circle top'>
              </div>
              <div className='Circle bottom'>
              </div>
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
            <span>{t('Passengers')}: {trip.passengers}</span>
          </div>
        </div>
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
      {activeTrips.length === 0 ? (
        <div className='ProposeBuyTicket ProposeBuyTicketAcc'>
          <span>{t('ProposeBuyTicketAcc')}</span>
          <a href='/map' className='ButtonBuyTickets ButtonBuyTicketsAcc'><span>{t('BuyTickets')}</span></a>
        </div>
      ) : (
        <>
          {renderTrips(groupedActiveTrips, showAllActiveTrips)}
          {activeTrips.length > 5 && !showAllActiveTrips && (
            <button className='ShowAllButton' onClick={handleShowAllActiveTrips}><span>{t('ShowAllActiveTrips')}</span></button>
          )}
        </>
      )}
    </div>
  );
}

export default Travels;
