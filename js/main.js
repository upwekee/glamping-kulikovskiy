/**
 * ГЛЭМПИНГ «КУЛИКОВСКИЙ» (ЭКО-ОТЕЛЬ ОРЕНБУРГ) — v2.0
 * Реальные цены, фотогалерея миниатюр, Lightbox, расчет будни/выходные,
 * интеграция бронирования через VK и телефон.
 */

// Немедленный запуск прелоадера
initPreloader();

document.addEventListener('DOMContentLoaded', () => {
  initDates();
  initHeaderScroll();
  initFAQ();
  initMobileMenu();
  calculateTotal();
  initHeroVideoSwitcher();
  initBookingBarSwipe();
  initAboutSlider();
  initHousesSlider();
  initSpaSlider();
  initPromoSlider();
});

/* ==========================================================================
   СКАНДИНАВСКИЙ ПРЕЛОАДЕР (PREMIUM INTRO SCREEN)
   ========================================================================== */
function initPreloader() {
  const preloader = document.getElementById('sitePreloader');
  const fill = document.getElementById('preloaderFill');
  const status = document.getElementById('preloaderStatus');
  const v1 = document.getElementById('heroVideo1');
  const v2 = document.getElementById('heroVideo2');
  if (!preloader) return;

  const startTime = Date.now();
  const minDisplayTime = 1400; // Минимальное время для плавной эстетики
  let progress = 15;
  let isDone = false;
  let pageLoaded = (document.readyState === 'complete');
  let videoReady = false;

  const setProgress = (val, text) => {
    progress = Math.max(progress, val);
    if (fill) fill.style.width = progress + '%';
    if (status && text && status.textContent !== text) {
      status.style.opacity = '0';
      setTimeout(() => {
        status.textContent = text;
        status.style.opacity = '1';
      }, 130);
    }
  };

  if (fill) fill.style.width = '15%';

  // Начальный плавный ход
  setTimeout(() => setProgress(35, 'Погружение в тишину леса...'), 100);

  // 1. Проверка загрузки DOM и изображений
  if (!pageLoaded) {
    window.addEventListener('load', () => {
      pageLoaded = true;
      setProgress(60, 'Загрузка медиаматериалов...');
      checkAllReady();
    });
  }

  // 2. Отслеживание реальной буферизации видео
  function markVideoReady() {
    if (videoReady) return;
    videoReady = true;
    setProgress(92, 'Подготовка видеопанорамы...');
    checkAllReady();
  }

  if (v1) {
    v1.preload = 'auto';
    if (v2) v2.preload = 'auto';

    // Слушаем прогресс скачивания видео
    v1.addEventListener('progress', () => {
      if (v1.duration > 0 && v1.buffered.length > 0) {
        const bufferedEnd = v1.buffered.end(v1.buffered.length - 1);
        const ratio = Math.min(1, bufferedEnd / Math.min(v1.duration, 4)); // хотя бы 4 сек в буфере
        const calcP = Math.floor(40 + ratio * 50);
        setProgress(calcP, 'Буферизация панорамы...');
      }
    });

    // Событие timeupdate и playing с currentTime > 0.1 гарантируют, что видео РЕАЛЬНО пошло!
    const checkPlayingTime = () => {
      if (v1.currentTime > 0.1) {
        markVideoReady();
      }
    };

    v1.addEventListener('timeupdate', checkPlayingTime);
    v1.addEventListener('playing', () => {
      setTimeout(() => {
        if (v1.currentTime > 0.05) markVideoReady();
      }, 100);
    });
    v1.addEventListener('canplaythrough', () => {
      if (v1.readyState >= 3) {
        // Запасной триггер если currentTime задерживается
        setTimeout(markVideoReady, 300);
      }
    });

    // Запускаем воспроизведение без преждевременного снятия заставки
    const p = v1.play();
    if (p !== undefined) {
      p.catch(() => {});
    }

    // Если видео уже воспроизводится
    if (v1.currentTime > 0.1) {
      markVideoReady();
    }
  } else {
    videoReady = true;
  }

  function checkAllReady() {
    if (pageLoaded && videoReady) {
      dismiss();
    }
  }

  const dismiss = () => {
    if (isDone) return;
    isDone = true;
    setProgress(100, 'Добро пожаловать');

    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, minDisplayTime - elapsed);

    setTimeout(() => {
      preloader.classList.add('loaded');
      document.body.classList.remove('preloader-active');
      document.body.classList.add('site-ready');

      setTimeout(() => {
        preloader.style.display = 'none';
      }, 950);
    }, remaining);
  };

  // Страховочный таймаут (8 сек на случай совсем дохлой мобильной сети)
  setTimeout(() => {
    if (!isDone) {
      dismiss();
    }
  }, 8000);
}

/* ==========================================================================
   ИНИЦИАЛИЗАЦИЯ ДАТ ПО УМОЛЧАНИЮ
   ========================================================================== */
function initDates() {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const formatDate = (date) => date.toISOString().split('T')[0];

  const checkIn = document.getElementById('calcCheckIn');
  const checkOut = document.getElementById('calcCheckOut');
  const quickIn = document.getElementById('quickCheckIn');
  const quickOut = document.getElementById('quickCheckOut');
  const tlIn = document.getElementById('tlCheckIn');
  const tlOut = document.getElementById('tlCheckOut');

  const todayStr = formatDate(today);
  const tomorrowStr = formatDate(tomorrow);

  if (checkIn && checkOut) {
    checkIn.min = todayStr;
    checkIn.value = todayStr;
    checkOut.min = tomorrowStr;
    checkOut.value = tomorrowStr;
  }

  if (quickIn && quickOut) {
    quickIn.min = todayStr;
    quickIn.value = todayStr;
    quickOut.min = tomorrowStr;
    quickOut.value = tomorrowStr;
    syncQuickDates();
  }

  if (tlIn && tlOut) {
    tlIn.min = todayStr;
    tlIn.value = todayStr;
    tlOut.min = tomorrowStr;
    tlOut.value = tomorrowStr;
    syncTLDates();
  }
}

/* ==========================================================================
   ДАННЫЕ ДОМОВ И КАЛЬКУЛЯТОР
   (Пн-Чт: будни, Пт-Вс: выходные)
   ========================================================================== */
const HOUSE_DATA = {
  river: {
    name: 'Домик для двоих с видом на реку',
    weekPrice: 7000,
    weekendPrice: 7500
  },
  cinema: {
    name: 'Домик для двоих с кинопроектором',
    weekPrice: 8000,
    weekendPrice: 8500
  },
  furako: {
    name: 'Домик с купелью Фурако',
    weekPrice: 12000,
    weekendPrice: 13000
  }
};

function calculateTotal() {
  const houseSelect = document.getElementById('calcHouseSelect');
  const checkInInput = document.getElementById('calcCheckIn');
  const checkOutInput = document.getElementById('calcCheckOut');

  if (!houseSelect || !checkInInput || !checkOutInput) return;

  const houseKey = houseSelect.value;
  const house = HOUSE_DATA[houseKey] || HOUSE_DATA.river;

  const inDate = new Date(checkInInput.value);
  const outDate = new Date(checkOutInput.value);

  // Проверка и корректировка дат
  let diffTime = outDate - inDate;
  let nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (isNaN(nights) || nights < 1) {
    nights = 1;
    const nextDay = new Date(inDate);
    nextDay.setDate(nextDay.getDate() + 1);
    checkOutInput.value = nextDay.toISOString().split('T')[0];
  }

  // Расчет стоимости по дням недели:
  // Пн(1), Вт(2), Ср(3), Чт(4) = будние
  // Пт(5), Сб(6), Вс(0) = выходные
  let basePrice = 0;
  let currentDate = new Date(inDate);

  for (let i = 0; i < nights; i++) {
    const dayOfWeek = currentDate.getDay(); // 0 = вс, 5 = пт, 6 = сб
    if (dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0) {
      basePrice += house.weekendPrice;
    } else {
      basePrice += house.weekPrice;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Дополнительные услуги
  let addonsPrice = 0;
  const optSauna = document.getElementById('optSauna');
  const optSups = document.getElementById('optSups');
  const optRomantic = document.getElementById('optRomantic');

  if (optSauna && optSauna.checked) addonsPrice += 3500;
  if (optSups && optSups.checked) addonsPrice += 2000;
  if (optRomantic && optRomantic.checked) addonsPrice += 2500;

  const totalPrice = basePrice + addonsPrice;

  // Форматирование
  const formatRub = (num) => num.toLocaleString('ru-RU') + ' ₽';

  // Обновление интерфейса
  const summaryHouseName = document.getElementById('summaryHouseName');
  const summaryNights = document.getElementById('summaryNights');
  const summaryBasePrice = document.getElementById('summaryBasePrice');
  const summaryAddonsPrice = document.getElementById('summaryAddonsPrice');
  const summaryTotalPrice = document.getElementById('summaryTotalPrice');

  if (summaryHouseName) summaryHouseName.innerText = house.name;
  if (summaryNights) summaryNights.innerText = `${nights} ${getNightsWord(nights)}`;
  if (summaryBasePrice) summaryBasePrice.innerText = formatRub(basePrice);
  if (summaryAddonsPrice) summaryAddonsPrice.innerText = formatRub(addonsPrice);
  if (summaryTotalPrice) summaryTotalPrice.innerText = formatRub(totalPrice);

  return {
    houseName: house.name,
    nights: nights,
    checkIn: checkInInput.value,
    checkOut: checkOutInput.value,
    basePrice: basePrice,
    addonsPrice: addonsPrice,
    totalPrice: totalPrice,
    hasSauna: optSauna ? optSauna.checked : false,
    hasSups: optSups ? optSups.checked : false,
    hasRomantic: optRomantic ? optRomantic.checked : false
  };
}

function getNightsWord(count) {
  const rem10 = count % 10;
  const rem100 = count % 100;
  if (rem100 >= 11 && rem100 <= 14) return 'суток';
  if (rem10 === 1) return 'сутки';
  if (rem10 >= 2 && rem10 <= 4) return 'суток';
  return 'суток';
}

/* ==========================================================================
   ОТПРАВКА БРОНИРОВАНИЯ В ВКОНТАКТЕ
   ========================================================================== */
function getBookingMessageText() {
  const calc = calculateTotal();

  let addonsList = [];
  if (calc.hasSauna) addonsList.push('Русская баня на дровах (3 500 ₽)');
  if (calc.hasSups) addonsList.push('Сплав на сапах по Сакмаре (2 000 ₽)');
  if (calc.hasRomantic) addonsList.push('Романтическое оформление (2 500 ₽)');

  const addonsStr = addonsList.length > 0 ? addonsList.join(', ') : 'Без доп. услуг';

  return `Здравствуйте! Хочу забронировать отдых в глэмпинге «Куликовский» (Оренбург):
🏡 Домик: ${calc.houseName}
📅 Даты: ${calc.checkIn} — ${calc.checkOut} (${calc.nights} ${getNightsWord(calc.nights)})
🧖‍♂️ Дополнительно: ${addonsStr}
💰 Расчетная сумма по прайсу: ${calc.totalPrice.toLocaleString('ru-RU')} ₽

Подскажите, свободны ли эти даты?`;
}

function sendBookingToVK() {
  const msg = getBookingMessageText();

  // Копируем в буфер обмена для максимального удобства пользователя
  if (navigator.clipboard) {
    navigator.clipboard.writeText(msg).then(() => {
      showToast('✅ Текст заявки скопирован! Вставьте его в диалог в VK');
    }).catch(() => {});
  }

  // Открываем диалог с официальной группой
  setTimeout(() => {
    window.open('https://vk.me/glamping56', '_blank');
  }, 400);
}

/* ==========================================================================
   МИНИАТЮРЫ В КАРТОЧКАХ ДОМОВ
   ========================================================================== */
function switchHousePhoto(houseKey, imgSrc, thumbElement) {
  const mainImg = document.getElementById(`img-${houseKey}`);
  if (mainImg) {
    mainImg.style.opacity = '0.4';
    setTimeout(() => {
      mainImg.src = imgSrc;
      mainImg.style.opacity = '1';
    }, 120);
  }

  // Обновляем активный класс на превью
  const parent = thumbElement.parentElement;
  if (parent) {
    parent.querySelectorAll('.thumb-item').forEach(el => el.classList.remove('active'));
    thumbElement.classList.add('active');
  }
}

/* ==========================================================================
   ПОЛНОЭКРАННЫЙ LIGHTBOX ДЛЯ ФОТОГРАФИЙ
   ========================================================================== */
function openLightbox(src) {
  const modal = document.getElementById('lightboxModal');
  const img = document.getElementById('lightboxImg');
  if (modal && img) {
    img.src = src;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function openLightboxFromCard(cardId) {
  const card = document.getElementById(cardId);
  if (card) {
    const mainImg = card.querySelector('.house-main-img');
    if (mainImg) {
      openLightbox(mainImg.src);
    }
  }
}

function closeLightbox(e) {
  if (e.target.id === 'lightboxModal' || e.target.classList.contains('lightbox-close')) {
    const modal = document.getElementById('lightboxModal');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  }
}

function openCardPicker(cardEl) {
  if (!cardEl) return;
  const dateInput = cardEl.querySelector('.b-native-date');
  if (dateInput) {
    try {
      if (typeof dateInput.showPicker === 'function') {
        dateInput.showPicker();
        return;
      }
    } catch (err) {}
    dateInput.focus();
    return;
  }
  const selectEl = cardEl.querySelector('.b-native-select');
  if (selectEl) {
    try {
      if (typeof selectEl.showPicker === 'function') {
        selectEl.showPicker();
        return;
      }
    } catch (err) {}
    selectEl.focus();
  }
}

function formatDateRU(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
  }
  return dateStr;
}

function syncQuickDates() {
  const qIn = document.getElementById('quickCheckIn');
  const qOut = document.getElementById('quickCheckOut');
  const qInVal = document.getElementById('quickCheckInVal');
  const qOutVal = document.getElementById('quickCheckOutVal');

  if (qIn && qInVal && qIn.value) {
    qInVal.textContent = formatDateRU(qIn.value);
  }
  if (qOut && qOutVal && qOut.value) {
    qOutVal.textContent = formatDateRU(qOut.value);
  }

  if (qIn && qOut && qIn.value && qOut.value) {
    if (new Date(qOut.value) <= new Date(qIn.value)) {
      const nextDay = new Date(qIn.value);
      nextDay.setDate(nextDay.getDate() + 1);
      qOut.value = nextDay.toISOString().split('T')[0];
      if (qOutVal) qOutVal.textContent = formatDateRU(qOut.value);
    }
  }

  const calcIn = document.getElementById('calcCheckIn');
  const calcOut = document.getElementById('calcCheckOut');
  if (calcIn && qIn && qIn.value) calcIn.value = qIn.value;
  if (calcOut && qOut && qOut.value) calcOut.value = qOut.value;
}

function syncQuickHouseToCalc() {
  const qHouse = document.getElementById('quickHouse');
  const qHouseVal = document.getElementById('quickHouseVal');
  if (qHouse && qHouseVal && qHouse.options[qHouse.selectedIndex]) {
    qHouseVal.textContent = qHouse.options[qHouse.selectedIndex].text;
  }
  if (qHouse) {
    const val = qHouse.value;
    const calcHouse = document.getElementById('calcHouseSelect');
    if (calcHouse) {
      calcHouse.value = val;
    }
    syncCalcHousePills(val);
    calculateTotal();
  }
}

function syncTLDates() {
  const tlIn = document.getElementById('tlCheckIn');
  const tlOut = document.getElementById('tlCheckOut');
  const tlInDisp = document.getElementById('tlCheckInDisplay');
  const tlOutDisp = document.getElementById('tlCheckOutDisplay');

  if (tlIn && tlInDisp && tlIn.value) {
    tlInDisp.textContent = formatDateRU(tlIn.value);
  }
  if (tlOut && tlOutDisp && tlOut.value) {
    tlOutDisp.textContent = formatDateRU(tlOut.value);
  }

  if (tlIn && tlOut && tlIn.value && tlOut.value) {
    if (new Date(tlOut.value) <= new Date(tlIn.value)) {
      const nextDay = new Date(tlIn.value);
      nextDay.setDate(nextDay.getDate() + 1);
      tlOut.value = nextDay.toISOString().split('T')[0];
      if (tlOutDisp) tlOutDisp.textContent = formatDateRU(tlOut.value);
    }
  }

  const calcIn = document.getElementById('calcCheckIn');
  const calcOut = document.getElementById('calcCheckOut');
  if (calcIn && tlIn && tlIn.value) calcIn.value = tlIn.value;
  if (calcOut && tlOut && tlOut.value) calcOut.value = tlOut.value;
}

function applyTLBooking() {
  const tlIn = document.getElementById('tlCheckIn');
  const tlOut = document.getElementById('tlCheckOut');
  const calcIn = document.getElementById('calcCheckIn');
  const calcOut = document.getElementById('calcCheckOut');

  if (calcIn && tlIn && tlIn.value) calcIn.value = tlIn.value;
  if (calcOut && tlOut && tlOut.value) calcOut.value = tlOut.value;

  calculateTotal();

  const calcSection = document.getElementById('calculator');
  if (calcSection) {
    calcSection.scrollIntoView({ behavior: 'smooth' });
  }
}

/* ==========================================================================
   БЫСТРЫЙ ПОДБОР ИЗ HERO
   ========================================================================== */
function applyQuickBooking() {
  const qHouse = document.getElementById('quickHouse');
  const qIn = document.getElementById('quickCheckIn');
  const qOut = document.getElementById('quickCheckOut');

  const calcHouse = document.getElementById('calcHouseSelect');
  const calcIn = document.getElementById('calcCheckIn');
  const calcOut = document.getElementById('calcCheckOut');

  const val = qHouse ? qHouse.value : 'river';
  if (calcHouse) calcHouse.value = val;
  if (calcIn && qIn && qIn.value) calcIn.value = qIn.value;
  if (calcOut && qOut && qOut.value) calcOut.value = qOut.value;

  syncCalcHousePills(val);
  calculateTotal();

  const calcSection = document.getElementById('calculator');
  if (calcSection) {
    calcSection.scrollIntoView({ behavior: 'smooth' });
  }
}

function syncCalcHousePills(houseKey) {
  const pills = document.querySelectorAll('.calc-house-row, .calc-house-pill');
  pills.forEach(pill => {
    const fnStr = pill.getAttribute('onclick') || '';
    if (fnStr.includes(`'${houseKey}'`)) {
      pill.classList.add('active');
    } else {
      pill.classList.remove('active');
    }
  });
}

function pickCalcHouse(houseKey, el) {
  const calcHouse = document.getElementById('calcHouseSelect');
  if (calcHouse) {
    calcHouse.value = houseKey;
  }
  const quickHouse = document.getElementById('quickHouse');
  if (quickHouse) {
    quickHouse.value = houseKey;
    const quickHouseVal = document.getElementById('quickHouseVal');
    if (quickHouseVal && quickHouse.options[quickHouse.selectedIndex]) {
      quickHouseVal.textContent = quickHouse.options[quickHouse.selectedIndex].text;
    }
  }

  const parent = el.parentElement;
  if (parent) {
    parent.querySelectorAll('.calc-house-row, .calc-house-pill').forEach(p => p.classList.remove('active'));
    el.classList.add('active');
  }

  calculateTotal();
}

function selectHouseForBooking(houseKey) {
  const calcHouse = document.getElementById('calcHouseSelect');
  if (calcHouse) {
    calcHouse.value = houseKey;
  }
  const quickHouse = document.getElementById('quickHouse');
  if (quickHouse) {
    quickHouse.value = houseKey;
  }

  syncCalcHousePills(houseKey);

  calculateTotal();
  const calcSection = document.getElementById('calculator');
  if (calcSection) {
    calcSection.scrollIntoView({ behavior: 'smooth' });
  }
}

function addServiceToBooking(service) {
  if (service === 'баня') {
    const opt = document.getElementById('optSauna');
    if (opt) opt.checked = true;
  } else if (service === 'сапы') {
    const opt = document.getElementById('optSups');
    if (opt) opt.checked = true;
  }

  calculateTotal();
  const calcSection = document.getElementById('calculator');
  if (calcSection) {
    calcSection.scrollIntoView({ behavior: 'smooth' });
  }
}

/* ==========================================================================
   КОПИРОВАНИЕ ТОЧНЫХ КООРДИНАТ
   ========================================================================== */
function copyCoords() {
  const coords = '51.952065, 55.225675';
  if (navigator.clipboard) {
    navigator.clipboard.writeText(coords).then(() => {
      showToast('📍 Координаты скопированы: 51.952065, 55.225675');
    });
  }
}

/* ==========================================================================
   ТОСТ-УВЕДОМЛЕНИЕ
   ========================================================================== */
function showToast(text) {
  const toast = document.getElementById('toastNotice');
  if (toast) {
    toast.innerText = text;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3500);
  }
}

/* ==========================================================================
   ПОДАРОЧНЫЙ СЕРТИФИКАТ
   ========================================================================== */
function openCertificateModal() {
  const modal = document.getElementById('certModal');
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeCertModal() {
  const modal = document.getElementById('certModal');
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

function submitCertVK() {
  const amount = document.getElementById('certAmount').value;

  const msg = `Здравствуйте! Хочу заказать подарочный сертификат в глэмпинг «Куликовский» (Оренбург):
🎁 Номинал/вариант: ${amount}

Подскажите, как можно оплатить и забрать?`;

  if (navigator.clipboard) {
    navigator.clipboard.writeText(msg).then(() => {
      showToast('✅ Текст заявки скопирован! Вставьте в диалог в VK');
    });
  }

  setTimeout(() => {
    window.open('https://vk.me/glamping56', '_blank');
    closeCertModal();
  }, 400);
}

// Закрытие модалок по Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeCertModal();
    const lb = document.getElementById('lightboxModal');
    if (lb) lb.classList.remove('active');
    document.body.style.overflow = '';
  }
});

/* ==========================================================================
   FAQ
   ========================================================================== */
function initFAQ() {
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    if (question) {
      question.addEventListener('click', () => {
        const isActive = item.classList.contains('active');
        faqItems.forEach(other => other.classList.remove('active'));
        if (!isActive) {
          item.classList.add('active');
        }
      });
    }
  });
}

/* ==========================================================================
   HEADER SCROLL & MOBILE MENU
   ========================================================================== */
function initHeaderScroll() {
  const header = document.getElementById('header');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });
}

function initMobileMenu() {
  const btn = document.getElementById('mobileMenuBtn');
  const nav = document.querySelector('.nav-menu');
  if (btn && nav) {
    btn.addEventListener('click', () => {
      const isVisible = nav.style.display === 'flex';
      if (isVisible) {
        nav.style.display = '';
      } else {
        nav.style.display = 'flex';
        nav.style.flexDirection = 'column';
        nav.style.position = 'absolute';
        nav.style.top = '100%';
        nav.style.left = '0';
        nav.style.width = '100%';
        nav.style.background = 'rgba(9, 18, 16, 0.98)';
        nav.style.backdropFilter = 'blur(20px)';
        nav.style.padding = '20px 24px';
        nav.style.borderBottom = '1px solid rgba(200, 169, 126, 0.2)';
      }
    });

    nav.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        if (window.innerWidth <= 1024) {
          nav.style.display = '';
        }
      });
    });
  }
}

/* ==========================================================================
   ЧЕРЕДОВАНИЕ ФОНОВЫХ ВИДЕО (SEAMLESS CROSSFADE PLAYLIST)
   ========================================================================== */
function initHeroVideoSwitcher() {
  const v1 = document.getElementById('heroVideo1');
  const v2 = document.getElementById('heroVideo2');
  if (!v1 || !v2) return;

  const playlist = [
    'video/hero.mp4?v=orig1',
    'video/a_Create_a_subtle_aest.mp4?v=orig1'
  ];

  let currentIdx = 0;
  let activeVid = v1;
  let nextVid = v2;
  let transitioning = false;

  const tryPlayActive = () => {
    const p = activeVid.play();
    if (p !== undefined) p.catch(() => {});
  };
  tryPlayActive();

  function triggerCrossfade() {
    if (transitioning) return;
    transitioning = true;

    const nextIdx = (currentIdx + 1) % playlist.length;
    currentIdx = nextIdx;
    const targetSrc = playlist[nextIdx];

    const doSwitch = () => {
      nextVid.currentTime = 0;
      const playPromise = nextVid.play();

      const proceed = () => {
        nextVid.classList.add('active');
        activeVid.classList.remove('active');

        setTimeout(() => {
          activeVid.pause();
          const temp = activeVid;
          activeVid = nextVid;
          nextVid = temp;
          transitioning = false;

          const upcomingIdx = (currentIdx + 1) % playlist.length;
          nextVid.src = playlist[upcomingIdx];
          nextVid.load();
        }, 1400);
      };

      if (playPromise !== undefined) {
        playPromise.then(proceed).catch(proceed);
      } else {
        proceed();
      }
    };

    if (nextVid.readyState >= 2) {
      doSwitch();
    } else {
      nextVid.oncanplay = () => {
        nextVid.oncanplay = null;
        doSwitch();
      };
      nextVid.src = targetSrc;
      nextVid.load();
    }
  }

  function onTimeUpdate(e) {
    const vid = e.target;
    if (vid === activeVid && !transitioning && vid.duration) {
      const remaining = vid.duration - vid.currentTime;
      if (remaining <= 1.4) {
        triggerCrossfade();
      }
    }
  }

  v1.addEventListener('timeupdate', onTimeUpdate);
  v2.addEventListener('timeupdate', onTimeUpdate);

  v1.addEventListener('ended', () => {
    if (activeVid === v1) triggerCrossfade();
  });
  v2.addEventListener('ended', () => {
    if (activeVid === v2) triggerCrossfade();
  });
}

/* ==========================================================================
   СВАЙП БАРА БРОНИРОВАНИЯ В HERO (ДЛЯ МОБИЛЬНЫХ)
   ========================================================================== */
function initBookingBarSwipe() {
  const bar = document.getElementById('quickBookingBar');
  const dotsBar = document.getElementById('bookingDots');
  if (!bar || !dotsBar) return;

  const dots = dotsBar.querySelectorAll('.b-dot');
  bar.addEventListener('scroll', () => {
    const scrollLeft = bar.scrollLeft;
    const slides = bar.querySelectorAll('.booking-slide');
    if (!slides.length) return;
    const slideW = slides[0].offsetWidth || 1;
    const step = slideW + 20;
    const slideIdx = Math.min(dots.length - 1, Math.max(0, Math.round(scrollLeft / step)));
    dots.forEach((d, i) => {
      if (i === slideIdx) d.classList.add('active');
      else d.classList.remove('active');
    });
  }, { passive: true });
}

function goToBookingSlide(idx) {
  const bar = document.getElementById('quickBookingBar');
  if (!bar) return;
  const slides = bar.querySelectorAll('.booking-slide');
  if (slides[idx]) {
    slides[idx].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
  }
}

/* ==========================================================================
   СЛАЙДЕР «ФИЛОСОФИЯ ОТДЫХА» (СКАНДИНАВСКАЯ КИНЕМАТОГРАФИЧЕСКАЯ ГАЛЕРЕЯ)
   ========================================================================== */
let currentAboutSlide = 0;
let aboutAutoplayTimer = null;
const ABOUT_AUTOPLAY_INTERVAL = 4200; // 4.2 сек на слайд

function startAboutAutoplay() {
  stopAboutAutoplay();
  aboutAutoplayTimer = setInterval(() => {
    stepAboutSlide(1, true);
  }, ABOUT_AUTOPLAY_INTERVAL);
}

function stopAboutAutoplay() {
  if (aboutAutoplayTimer) {
    clearInterval(aboutAutoplayTimer);
    aboutAutoplayTimer = null;
  }
}

function resetAboutAutoplay() {
  stopAboutAutoplay();
  startAboutAutoplay();
}

function goToAboutSlide(idx, isAutoplay = false) {
  const slides = document.querySelectorAll('.about-slide');
  const dots = document.querySelectorAll('.about-dot');
  const counter = document.getElementById('aboutCounterBadge');
  if (!slides.length) return;

  if (!isAutoplay) {
    resetAboutAutoplay();
  }

  const total = slides.length;
  currentAboutSlide = (idx + total) % total;

  slides.forEach((slide, i) => {
    if (i === currentAboutSlide) {
      slide.classList.add('active');
    } else {
      slide.classList.remove('active');
    }
  });

  dots.forEach((dot, i) => {
    if (i === currentAboutSlide) {
      dot.classList.add('active');
    } else {
      dot.classList.remove('active');
    }
  });

  if (counter) {
    counter.textContent = `${currentAboutSlide + 1} / ${total}`;
  }
}

function stepAboutSlide(step, isAutoplay = false) {
  goToAboutSlide(currentAboutSlide + step, isAutoplay);
}

window.goToAboutSlide = goToAboutSlide;
window.goAboutSlide = goToAboutSlide;
window.stepAboutSlide = stepAboutSlide;

function initAboutSlider() {
  const stage = document.querySelector('.about-cinematic-stage') || document.querySelector('.about-cinematic-card') || document.querySelector('.about-slider-main-wrap');
  if (!stage) return;

  // Автоперелистывание с умной паузой при наведении курсора и тапах
  stage.addEventListener('mouseenter', stopAboutAutoplay);
  stage.addEventListener('mouseleave', startAboutAutoplay);

  let touchStartX = 0;
  let touchStartY = 0;

  stage.addEventListener('touchstart', (e) => {
    stopAboutAutoplay();
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  stage.addEventListener('touchend', (e) => {
    const deltaX = e.changedTouches[0].clientX - touchStartX;
    const deltaY = e.changedTouches[0].clientY - touchStartY;

    if (Math.abs(deltaX) > 35 && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX < 0) {
        stepAboutSlide(1); // свайп влево -> следующее фото
      } else {
        stepAboutSlide(-1); // свайп вправо -> предыдущее фото
      }
    }
    resetAboutAutoplay();
  }, { passive: true });

  // Клавиатурная навигация при фокусе
  stage.setAttribute('tabindex', '0');
  stage.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') {
      stepAboutSlide(1);
    } else if (e.key === 'ArrowLeft') {
      stepAboutSlide(-1);
    }
  });

  // Запуск автоплея только когда секция видна на экране (экономия ресурсов и батареи)
  if ('IntersectionObserver' in window) {
    const aboutSection = document.getElementById('about');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          startAboutAutoplay();
        } else {
          stopAboutAutoplay();
        }
      });
    }, { threshold: 0.2 });

    if (aboutSection) {
      observer.observe(aboutSection);
    } else {
      startAboutAutoplay();
    }
  } else {
    startAboutAutoplay();
  }
}

/* ==========================================================================
   МОБИЛЬНЫЙ ГОРИЗОНТАЛЬНЫЙ СЛАЙДЕР ДОМОВ
   ========================================================================== */
function scrollHouseSlide(index) {
  const grid = document.getElementById('housesGrid');
  if (!grid) return;
  const cards = grid.querySelectorAll('.house-card');
  if (cards[index]) {
    const card = cards[index];
    const leftOffset = card.offsetLeft - (grid.clientWidth - card.clientWidth) / 2;
    grid.scrollTo({ left: leftOffset, behavior: 'smooth' });
    updateHouseDots(index);
  }
}

function updateHouseDots(activeIndex) {
  const dots = document.querySelectorAll('#housesSliderDots .houses-dot');
  dots.forEach((dot, idx) => {
    if (idx === activeIndex) {
      dot.classList.add('active');
    } else {
      dot.classList.remove('active');
    }
  });
}

function initHousesSlider() {
  const grid = document.getElementById('housesGrid');
  if (!grid) return;

  let scrollTimeout;
  grid.addEventListener('scroll', () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      const cards = grid.querySelectorAll('.house-card');
      const gridCenter = grid.scrollLeft + grid.clientWidth / 2;
      let closestIdx = 0;
      let minDiff = Infinity;
      cards.forEach((card, idx) => {
        const cardCenter = card.offsetLeft + card.clientWidth / 2;
        const diff = Math.abs(cardCenter - gridCenter);
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = idx;
        }
      });
      updateHouseDots(closestIdx);
    }, 40);
  }, { passive: true });
}

/* ==========================================================================
   МОБИЛЬНЫЙ ГОРИЗОНТАЛЬНЫЙ СЛАЙДЕР «ОСОБОЕ УДОВОЛЬСТВИЕ» (СПА / БАНЯ / САПЫ)
   ========================================================================== */
function scrollSpaSlide(index) {
  const grid = document.getElementById('spaGrid');
  if (!grid) return;
  const cards = grid.querySelectorAll('.spa-card');
  if (cards[index]) {
    const card = cards[index];
    const leftOffset = card.offsetLeft - (grid.clientWidth - card.clientWidth) / 2;
    grid.scrollTo({ left: leftOffset, behavior: 'smooth' });
    updateSpaDots(index);
  }
}

function updateSpaDots(activeIndex) {
  const dots = document.querySelectorAll('#spaSliderDots .spa-dot');
  dots.forEach((dot, idx) => {
    if (idx === activeIndex) {
      dot.classList.add('active');
    } else {
      dot.classList.remove('active');
    }
  });
}

function initSpaSlider() {
  const grid = document.getElementById('spaGrid');
  if (!grid) return;

  let scrollTimeout;
  grid.addEventListener('scroll', () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      const cards = grid.querySelectorAll('.spa-card');
      const gridCenter = grid.scrollLeft + grid.clientWidth / 2;
      let closestIdx = 0;
      let minDiff = Infinity;
      cards.forEach((card, idx) => {
        const cardCenter = card.offsetLeft + card.clientWidth / 2;
        const diff = Math.abs(cardCenter - gridCenter);
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = idx;
        }
      });
      updateSpaDots(closestIdx);
    }, 40);
  }, { passive: true });
}

/* ==========================================================================
   МОБИЛЬНЫЙ ГОРИЗОНТАЛЬНЫЙ СЛАЙДЕР «СПЕЦПРЕДЛОЖЕНИЯ» (АКЦИИ И СЕРТИФИКАТЫ)
   ========================================================================== */
function scrollPromoSlide(index) {
  const grid = document.getElementById('promoGrid');
  if (!grid) return;
  const cards = grid.querySelectorAll('.promo-card');
  if (cards[index]) {
    const card = cards[index];
    const leftOffset = card.offsetLeft - (grid.clientWidth - card.clientWidth) / 2;
    grid.scrollTo({ left: leftOffset, behavior: 'smooth' });
    updatePromoDots(index);
  }
}

function updatePromoDots(activeIndex) {
  const dots = document.querySelectorAll('#promoSliderDots .promo-dot');
  dots.forEach((dot, idx) => {
    if (idx === activeIndex) {
      dot.classList.add('active');
    } else {
      dot.classList.remove('active');
    }
  });
}

function initPromoSlider() {
  const grid = document.getElementById('promoGrid');
  if (!grid) return;

  let scrollTimeout;
  grid.addEventListener('scroll', () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      const cards = grid.querySelectorAll('.promo-card');
      const gridCenter = grid.scrollLeft + grid.clientWidth / 2;
      let closestIdx = 0;
      let minDiff = Infinity;
      cards.forEach((card, idx) => {
        const cardCenter = card.offsetLeft + card.clientWidth / 2;
        const diff = Math.abs(cardCenter - gridCenter);
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = idx;
        }
      });
      updatePromoDots(closestIdx);
    }, 40);
  }, { passive: true });
}

window.scrollSpaSlide = scrollSpaSlide;
window.scrollPromoSlide = scrollPromoSlide;




