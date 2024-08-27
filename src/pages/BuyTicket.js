import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import '../stylesheets/BuyTicket.css';
import axios from 'axios';
import { Helmet } from 'react-helmet-async';

const BuyTicket = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { travel, language } = location.state || {};

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [smallBaggage, setSmallBaggage] = useState(0);
  const [largeBaggage, setLargeBaggage] = useState(0);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [buttonDisabled, setButtonDisabled] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState({ text: '', buttonText: '', onClick: () => {} });

  const [NumberPassengers, setNumberPassengers] = useState(1); // Состояние для количества пассажиров
  const fromToTicketRef = useRef(null);
  const routeSymbolRef = useRef(null);

  useEffect(() => {
    if (fromToTicketRef.current && routeSymbolRef.current) {
      const height = fromToTicketRef.current.clientHeight;
      routeSymbolRef.current.style.height = `${height}px`;
    }
  }, []);

  const handleSmallBaggageChange = (amount) => {
    setSmallBaggage(Math.max(0, Math.min(40, smallBaggage + amount)));
  };

  const handleLargeBaggageChange = (amount) => {
    setLargeBaggage(Math.max(0, Math.min(20, largeBaggage + amount)));
  };

  const handleNumberPassengers = (amount) => {
    setNumberPassengers((prev) => Math.max(1, Math.min(10, prev + amount)));
  };

  const validateInputs = useCallback(() => {
    const isValidName = firstName.length > 0 && firstName.length <= 60;
    const isValidLastName = lastName.length > 0 && lastName.length <= 60;
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const isValidPhone = phone.length > 0;
    return isValidName && isValidLastName && isValidEmail && isValidPhone;
  }, [firstName, lastName, email, phone]);

  useEffect(() => {
    setButtonDisabled(!validateInputs());
  }, [firstName, lastName, email, phone, validateInputs]);

  useEffect(() => {
    if (showModal) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
  }, [showModal]);

  // Состояния для цены в евро и гривнах
  const [priceUA, setPriceUA] = useState(0);
  const [priceEN, setPriceEN] = useState(0);

  const calculatePrices = useCallback(() => {
    const basePriceUA = parseInt(travel.priceUA, 10) * NumberPassengers;
    const basePriceEN = parseInt(travel.priceEN, 10) * NumberPassengers;

    const smallBaggagePriceUA = smallBaggage * 150;
    const smallBaggagePriceEN = smallBaggage * 5;

    const largeBaggagePriceUA = largeBaggage * 300;
    const largeBaggagePriceEN = largeBaggage * 10;

    const totalPriceUA = basePriceUA + smallBaggagePriceUA + largeBaggagePriceUA;
    const totalPriceEN = basePriceEN + smallBaggagePriceEN + largeBaggagePriceEN;

    setPriceUA(totalPriceUA);
    setPriceEN(totalPriceEN);
  }, [smallBaggage, largeBaggage, travel.priceUA, travel.priceEN, NumberPassengers]);

  useEffect(() => {
    calculatePrices();
  }, [calculatePrices]);

  const handleBuyTicket = async () => {
    if (!validateInputs()) {
      setModalContent({
        text: t('FailedBuyTicket'),
        buttonText: 'OK',
        onClick: () => setShowModal(false),
      });
      setShowModal(true);
      return;
    }

    const formatDate = (dateString) => {
      const date = new Date(dateString);
      if (isNaN(date)) {
        return null;
      }
      return date.toISOString().split('T')[0];
    };

    const dateDeparture = formatDate(travel.date_departure);
    const dateArrival = formatDate(travel.date_arrival);

    if (!dateDeparture || !dateArrival) {
      setModalContent({
        text: t('FailedBuyTicket'),
        buttonText: 'OK',
        onClick: () => setShowModal(false),
      });
      setShowModal(true);
      return;
    }

    const ticketData = {
      from: travel.fromEN,
      fromLocation: travel.fromLocationEN,
      to: travel.toEN,
      toLocation: travel.toLocationEN,
      typeEN: travel.typeEN,
      typeUA: travel.typeUA,
      passengers: NumberPassengers, // Передаем количество пассажиров
      priceEN: priceEN,
      priceUA: priceUA,
      date_departure: dateDeparture,
      departure: travel.departure,
      duration: travel.duration,
      date_arrival: dateArrival,
      arrival: travel.arrival,
      baggage: { smallBaggage, largeBaggage },
      firstName,
      lastName,
      email,
      phone,
      language,
    };

    try {
      const token = localStorage.getItem('accessToken');
      const customHeader = 'expectedHeaderValue'; // Замените на ваше значение

      if (!token) {
        throw new Error('No token found');
      }

      const response = await axios.post('https://bus-travel-release-7e3983a29e39.herokuapp.com/api/tickets', ticketData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-custom-header': customHeader,
        },
      });
      console.log('Ticket created successfully:', response.data);

      setModalContent({
        text: t('SuccesBuyTicket'),
        buttonText: 'OK',
        onClick: () => {
          setShowModal(false);
          navigate('/account');
        },
      });
      setShowModal(true);
    } catch (error) {
      console.error('Error creating ticket:', error);
      setModalContent({
        text: t('FailedBuyTicket'),
        buttonText: 'OK',
        onClick: () => setShowModal(false),
      });
      setShowModal(true);
    }
  };

  return (
    <div className='BuyTicketUser'>
      <Helmet>
        <title>{t('titles.buy-ticket')}</title>
      </Helmet>
      <div className='InfoBuyTicketUser'>
        <h1>{t('BuyTicketTextUser')}</h1>
      </div>
      <div className='MainInfoBuyTicketUser'>
        <div className='TicketInfoBuy'>
          <div className='UserInfo StageDiv FirstStage'>
            <div className='NameTitle NameTitleUserInfo'>
              <span className='Stage'>1</span>
              <span className='NameTitleBuyTicket NameTitleBuyTicketNameUser'>{t('NameTitleBuyTicketNameUser')}</span>
            </div>
            <div className='MainInputs MainInputsNameUser'>
              <input
                type='text'
                placeholder={t('FirstName')}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
              <input
                type='text'
                placeholder={t('LastName')}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>

          <div className='DataBaggage StageDiv SecondStage'>
            <div className='NameTitle NameTitleUserInfo'>
              <span className='Stage'>2</span>
              <span className='NameTitleBuyTicket NameTitleBuyTicketDataBaggage'>{t('NameTitleBuyTicketDataBaggage')}</span>
            </div>
            <div className='MainInputs MainInputsDataBaggage'>
              <div className='HandLuggage BaggageDiv'><span>{t('HandLuggage')}:</span><span>{t('Free')}</span></div>
              <div className='GorisontalLine'></div>
              <div className='SmallBaggage BaggageDiv'>
                <div className='InfoBaggageType'>
                  <span>{t('SmallBaggage')}:</span><span className='AddInfoBaggage'> 5kg, 55x40x20cm</span>
                </div>
                <div className='RightPartBaggage'>
                  <div className='picking-baggage'>
                    <button onClick={() => handleSmallBaggageChange(-1)}>-</button>
                    <input
                      type='number'
                      value={smallBaggage}
                      readOnly
                    />
                    <button onClick={() => handleSmallBaggageChange(1)}>+</button>
                  </div>
                  <div><span>{smallBaggage * (language === 'ua' ? 150 : 5)} {language === 'ua' ? 'грн' : '€'}</span></div>
                </div>
              </div>
              <div className='LargeBaggage BaggageDiv'>
                <div className='InfoBaggageType'>
                  <span>{t('LargeBaggage')}:</span><span className='AddInfoBaggage'> 20kg, 80x50x30cm</span>
                </div>
                <div className='RightPartBaggage'>
                  <div className='picking-baggage'>
                    <button onClick={() => handleLargeBaggageChange(-1)}>-</button>
                    <input
                      type='number'
                      value={largeBaggage}
                      readOnly
                    />
                    <button onClick={() => handleLargeBaggageChange(1)}>+</button>
                  </div>
                  <div><span>{largeBaggage * (language === 'ua' ? 300 : 10)} {language === 'ua' ? 'грн' : '€'}</span></div>
                </div>
              </div>
            </div>
          </div>

          <div className='DataContactUser StageDiv ThirdStage'>
            <div className='NameTitle NameTitleDataContactUser'>
              <span className='Stage'>3</span>
              <span className='NameTitleBuyTicket NameTitleBuyTicketDataDataContactUser'>{t('NameTitleBuyTicketDataDataContactUser')}</span>
            </div>
            <div className='DataContactUserMain'>
              <div className='EnterEmailBT'>
                <input
                  type='email'
                  placeholder={t('Email')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className='phone-input'>
                <PhoneInput
                  country={'us'}
                  value={phone}
                  onChange={setPhone}
                />
              </div>
            </div>
          </div>

          <div className='NPassengers StageDiv FourthStage'>
            <div className='NameTitle NameTitleNPassengers'>
              <span className='Stage'>4</span>
              <span className='NameTitleBuyTicket NameTitleBuyTicketNPassengers'>{t('NameTitleBuyTicketNPassengers')}</span>
            </div>
            <div className='NPassengers'>
              <div className='NumberPassengers'>
                <div className='picking-NumberPassengers'>
                  <button onClick={() => handleNumberPassengers(-1)}>-</button>
                  <input
                    type='number'
                    value={NumberPassengers}
                    readOnly
                  />
                  <button onClick={() => handleNumberPassengers(1)}>+</button>
                </div>
                <div><span>{NumberPassengers}</span></div>
              </div>
            </div>
          </div>
        </div>

        <div className='AddInfoTicketBuy'>
          <div className='ProgressTicketBuyVertical'>
            <div className='RouteSymbolBuyTicket' ref={routeSymbolRef}>
              <div className='Line'></div>
              <div className='Circle top'></div>
              <div className='Circle bottom'></div>
            </div>
            <div className='FromToTicketTicketBuyVertical' ref={fromToTicketRef}>
              <div className='FromTicketBuy'>
                <span className='CityInfoTicketBuy'>{language === 'ua' ? travel.fromUA : travel.fromEN}</span>
                <span className='StreetInfoTicketBuy'>{language === 'ua' ? travel.fromLocationUA : travel.fromLocationEN}</span>
                <span className='DepartureInfoTicketBuy'>{travel.departure}</span>
              </div>
              <div className='ToTicketBuy'>
                <span className='CityInfoTicketBuy'>{language === 'ua' ? travel.toUA : travel.toEN}</span>
                <span className='StreetInfoTicketBuy'>{language === 'ua' ? travel.toLocationUA : travel.toLocationEN}</span>
                <span className='DepartureInfoTicketBuy'>{travel.arrival}</span>
              </div>
            </div>
          </div>
          <div className='AddInfoTicketBT'>
            <div className='DurationTicket'><span>{t('DurationTicket')}</span><span>{travel.duration}{t('hours')}</span></div>
          </div>
          <div className='PriceBuyTicket'>
            <div className='TicketPrice'>
              <span>{t('TotalPrice')}</span>
              <span>{language === 'ua' ? priceUA : priceEN}{language === 'ua' ? ' грн' : ' €'}</span>
            </div>
          </div>
          <div className='ButtonConfirmBuyTicket'>
            <button
              onClick={handleBuyTicket}
              style={{ backgroundColor: buttonDisabled ? 'red' : 'var(--blue)' }}
            >
              {t('ConfirmPurchase')}
            </button>
          </div>
        </div>
      </div>
      {showModal && (
        <div className="modal">
          <div className="modal-content">
            <span>{modalContent.text}</span>
            <button onClick={modalContent.onClick}>{modalContent.buttonText}</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BuyTicket;
