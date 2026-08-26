/**
 * Serveri kasutajale nähtavad teated.
 *
 * Mobiiliäpp on tõlgitud, aga serveri vastused jõuavad kasutajani samamoodi
 * ("Oled objektist 153 m kaugusel") — ilma nendeta oleks äpp pooleldi
 * tõlgitud just nendes kohtades, kus teade on kõige olulisem.
 *
 * Keel valitakse `Accept-Language` päise järgi. Sõnastikud on typitud eesti
 * keele järgi, seega puuduv võti on kompileerimisviga.
 */

export const et = {
  invalidInput: "Sisendandmed on vigased.",
  serverError: "Serveri viga.",

  auth: {
    invalidCredentials: "Vale ettevõtte kood, kasutajanimi või parool.",
    invalidRefreshToken: "Refresh-token on vale või aegunud.",
    orgCodeTaken: "See ettevõtte kood on juba kasutusel.",
    usernameOrEmailTaken: "Kasutajanimi või e-mail on selles ettevõttes juba kasutusel.",
    usernameOrEmailTakenInOrg: "See kasutajanimi või e-mail on selles ettevõttes juba kasutusel.",
    orgCodeNotFound: "Sellist ettevõtte koodi ei leitud. Kontrolli koodi oma tööandjalt.",
    requestAlreadyPending: "Sellise nimega taotlus on juba esitatud ja ootab kinnitust.",
    requestRejected: "Sinu liitumistaotlus lükati tagasi. Võta ühendust ettevõtte administraatoriga.",
    pendingApproval:
      "Sinu liitumistaotlus ootab veel ettevõtte administraatori kinnitust. Proovi hiljem uuesti.",
    pendingRequestNotFound: "Ootel taotlust ei leitud.",
    resetLinkExpired: "Link on aegunud või juba kasutatud. Palun küsi uus taastamise link.",
  },

  timeLogs: {
    tooFar: (distance: number, radius: number) =>
      `Oled objektist ${distance} m kaugusel, lubatud on ${radius} m. Tööpäeva saab alustada ainult objektil.`,
    alreadyStarted: "Tööpäev sellel objektil on juba alustatud.",
    noActiveLog: "Aktiivset töölogi ei leitud. Tööpäev pole alustatud või on juba lõpetatud.",
    notFound: "Töölogi ei leitud.",
    endBeforeStart: "Lõpetamise aeg on tööpäeva algusest varasem.",
    clockInFuture: "Seadme kell näitab tulevikku. Kontrolli telefoni kellaaega ja proovi uuesti.",
    clockInFutureShort: "Seadme kell näitab tulevikku. Kontrolli telefoni kellaaega.",
    tooOldOffline:
      "Salvestatud tööpäev on liiga vana, et seda automaatselt lisada. Võta ühendust administraatoriga.",
    reasonRequired: (computed: number) =>
      `Tundide käsitsi muutmiseks on vaja põhjendust. Kohaloleku järgi arvutatud tunnid: ${computed} h.`,
  },

  objects: {
    notFound: "Objekti ei leitud.",
    selectedNotFound: "Valitud objekti ei leitud.",
    hasTimeLogs: "Objekti ei saa kustutada, kuna sellel on seotud töölogisid.",
  },

  users: {
    notFound: "Kasutajat ei leitud.",
    hasTimeLogs: "Kasutajat ei saa kustutada, kuna tal on seotud töölogisid.",
  },

  absences: {
    notFound: "Puudumist ei leitud.",
    overlapping: (from: string, to: string) => `Sellel töötajal on juba puudumine perioodil ${from} – ${to}.`,
  },

  workTypes: {
    notFound: "Tööliiki ei leitud.",
    selectedNotFound: "Valitud tööliiki ei leitud.",
    duplicate: "Sellise nimega tööliik on juba olemas.",
    notOnObject: "See tööliik ei ole sellel objektil kasutusel.",
  },

  clients: {
    notFound: "Tellijat ei leitud.",
    duplicate: "Sellise nimega tellija on juba olemas.",
    hasObjects: "Tellijat ei saa kustutada, kuna tal on seotud objekte.",
    missingDetails: "Tellijal puudub nimi või aadress — arvet ei saa vormistada.",
  },

  invoices: {
    notFound: "Arvet ei leitud.",
    noBillableHours:
      "Valitud perioodil ei ole ühtegi arveldatavat tundi. Kontrolli, kas tööliikidel on hind määratud.",
    alreadyVoided: "Arve on juba tühistatud.",
    cannotVoidPaid: "Makstud arvet ei saa tühistada. Vormista vajadusel kreeditarve.",
    sellerDetailsMissing:
      "Ettevõtte rekvisiidid on täitmata. Lisa need seadetes enne arve koostamist.",
  },

  billing: {
    notConfigured: "Maksete vastuvõtt pole seadistatud.",
    notConfiguredContact: "Maksete vastuvõtt pole veel seadistatud. Võta ühendust Nutisemud'iga.",
  },

  password: {
    tooShort: "Parool peab olema vähemalt 12 tähemärki pikk.",
    needsDigit: "Parool peab sisaldama vähemalt ühte numbrit.",
    needsSymbol: "Parool peab sisaldama vähemalt ühte sümbolit.",
  },

  access: {
    forbidden: "Puuduvad õigused.",
    missingAuth: "Autentimine puudub.",
    invalidToken: "Token on vale või aegunud.",
    sessionEnded: "Sessioon on lõpetatud. Palun logi uuesti sisse.",
    unauthorized: "Autentimine on vajalik.",
  },
};

export type Messages = typeof et;

export const en: Messages = {
  invalidInput: "The submitted data is invalid.",
  serverError: "Server error.",

  auth: {
    invalidCredentials: "Wrong company code, username or password.",
    invalidRefreshToken: "The refresh token is invalid or expired.",
    orgCodeTaken: "That company code is already taken.",
    usernameOrEmailTaken: "That username or email is already used in this company.",
    usernameOrEmailTakenInOrg: "That username or email is already used in this company.",
    orgCodeNotFound: "No such company code. Check the code with your employer.",
    requestAlreadyPending: "A request with that name has already been submitted and is awaiting approval.",
    requestRejected: "Your join request was rejected. Please contact the company administrator.",
    pendingApproval:
      "Your join request is still waiting for the company administrator's approval. Please try again later.",
    pendingRequestNotFound: "No pending request found.",
    resetLinkExpired: "The link has expired or was already used. Please request a new reset link.",
  },

  timeLogs: {
    tooFar: (distance: number, radius: number) =>
      `You are ${distance} m from the site, the limit is ${radius} m. A workday can only be started on site.`,
    alreadyStarted: "A workday at this site has already been started.",
    noActiveLog: "No active workday found. It was not started, or it is already finished.",
    notFound: "Work record not found.",
    endBeforeStart: "The end time is earlier than the start of the workday.",
    clockInFuture: "Your device clock is in the future. Check the time on your phone and try again.",
    clockInFutureShort: "Your device clock is in the future. Check the time on your phone.",
    tooOldOffline: "The saved workday is too old to add automatically. Please contact your administrator.",
    reasonRequired: (computed: number) =>
      `Changing the hours by hand requires a reason. Hours computed from presence: ${computed} h.`,
  },

  objects: {
    notFound: "Site not found.",
    selectedNotFound: "The selected site was not found.",
    hasTimeLogs: "This site cannot be deleted because work records are attached to it.",
  },

  users: {
    notFound: "User not found.",
    hasTimeLogs: "This user cannot be deleted because work records are attached to them.",
  },

  absences: {
    notFound: "Absence not found.",
    overlapping: (from: string, to: string) => `This worker already has an absence for ${from} – ${to}.`,
  },

  workTypes: {
    notFound: "Work type not found.",
    selectedNotFound: "The selected work type was not found.",
    duplicate: "A work type with that name already exists.",
    notOnObject: "That work type is not in use on this site.",
  },

  clients: {
    notFound: "Client not found.",
    duplicate: "A client with that name already exists.",
    hasObjects: "This client cannot be deleted because sites are linked to it.",
    missingDetails: "The client has no name or address — an invoice cannot be issued.",
  },

  invoices: {
    notFound: "Invoice not found.",
    noBillableHours:
      "There are no billable hours in the selected period. Check that the work types have rates set.",
    alreadyVoided: "This invoice has already been voided.",
    cannotVoidPaid: "A paid invoice cannot be voided. Issue a credit note instead.",
    sellerDetailsMissing: "Your company details are missing. Add them in settings before invoicing.",
  },

  billing: {
    notConfigured: "Payments are not set up.",
    notConfiguredContact: "Payments are not set up yet. Please contact Nutisemud.",
  },

  password: {
    tooShort: "The password must be at least 12 characters long.",
    needsDigit: "The password must contain at least one digit.",
    needsSymbol: "The password must contain at least one symbol.",
  },

  access: {
    forbidden: "You do not have permission.",
    missingAuth: "Authentication is missing.",
    invalidToken: "The token is invalid or expired.",
    sessionEnded: "The session has ended. Please sign in again.",
    unauthorized: "Authentication required.",
  },
};

export const ru: Messages = {
  invalidInput: "Отправленные данные неверны.",
  serverError: "Ошибка сервера.",

  auth: {
    invalidCredentials: "Неверный код предприятия, имя пользователя или пароль.",
    invalidRefreshToken: "Refresh-токен неверен или истёк.",
    orgCodeTaken: "Этот код предприятия уже занят.",
    usernameOrEmailTaken: "Это имя пользователя или эл. почта уже используются на этом предприятии.",
    usernameOrEmailTakenInOrg: "Это имя пользователя или эл. почта уже используются на этом предприятии.",
    orgCodeNotFound: "Такой код предприятия не найден. Уточните код у своего работодателя.",
    requestAlreadyPending: "Заявка с таким именем уже подана и ожидает подтверждения.",
    requestRejected: "Ваша заявка на присоединение отклонена. Свяжитесь с администратором предприятия.",
    pendingApproval:
      "Ваша заявка на присоединение ещё ожидает подтверждения администратора предприятия. Попробуйте позже.",
    pendingRequestNotFound: "Заявка в ожидании не найдена.",
    resetLinkExpired: "Ссылка истекла или уже использована. Запросите новую ссылку для восстановления.",
  },

  timeLogs: {
    tooFar: (distance: number, radius: number) =>
      `Вы в ${distance} м от объекта, допустимо ${radius} м. Рабочий день можно начать только на объекте.`,
    alreadyStarted: "Рабочий день на этом объекте уже начат.",
    noActiveLog: "Активный рабочий день не найден. Он не был начат или уже завершён.",
    notFound: "Запись о работе не найдена.",
    endBeforeStart: "Время завершения раньше начала рабочего дня.",
    clockInFuture: "Часы устройства показывают будущее. Проверьте время на телефоне и попробуйте снова.",
    clockInFutureShort: "Часы устройства показывают будущее. Проверьте время на телефоне.",
    tooOldOffline: "Сохранённый рабочий день слишком старый для автоматического добавления. Свяжитесь с администратором.",
    reasonRequired: (computed: number) =>
      `Для изменения часов вручную нужно основание. Часы по присутствию: ${computed} ч.`,
  },

  objects: {
    notFound: "Объект не найден.",
    selectedNotFound: "Выбранный объект не найден.",
    hasTimeLogs: "Объект нельзя удалить, так как с ним связаны записи о работе.",
  },

  users: {
    notFound: "Пользователь не найден.",
    hasTimeLogs: "Пользователя нельзя удалить, так как с ним связаны записи о работе.",
  },

  absences: {
    notFound: "Отсутствие не найдено.",
    overlapping: (from: string, to: string) => `У этого работника уже есть отсутствие за период ${from} – ${to}.`,
  },

  workTypes: {
    notFound: "Вид работ не найден.",
    selectedNotFound: "Выбранный вид работ не найден.",
    duplicate: "Вид работ с таким названием уже существует.",
    notOnObject: "Этот вид работ не используется на данном объекте.",
  },

  clients: {
    notFound: "Заказчик не найден.",
    duplicate: "Заказчик с таким названием уже существует.",
    hasObjects: "Заказчика нельзя удалить, так как с ним связаны объекты.",
    missingDetails: "У заказчика не указано название или адрес — счёт выставить нельзя.",
  },

  invoices: {
    notFound: "Счёт не найден.",
    noBillableHours:
      "За выбранный период нет оплачиваемых часов. Проверьте, указаны ли ставки у видов работ.",
    alreadyVoided: "Счёт уже аннулирован.",
    cannotVoidPaid: "Оплаченный счёт нельзя аннулировать. Оформите кредитный счёт.",
    sellerDetailsMissing: "Реквизиты вашей компании не заполнены. Добавьте их в настройках.",
  },

  billing: {
    notConfigured: "Приём платежей не настроен.",
    notConfiguredContact: "Приём платежей ещё не настроен. Свяжитесь с Nutisemud.",
  },

  password: {
    tooShort: "Пароль должен содержать не менее 12 символов.",
    needsDigit: "Пароль должен содержать хотя бы одну цифру.",
    needsSymbol: "Пароль должен содержать хотя бы один специальный символ.",
  },

  access: {
    forbidden: "Недостаточно прав.",
    missingAuth: "Аутентификация отсутствует.",
    invalidToken: "Токен неверен или истёк.",
    sessionEnded: "Сессия завершена. Войдите снова.",
    unauthorized: "Требуется аутентификация.",
  },
};

export const uk: Messages = {
  invalidInput: "Надіслані дані хибні.",
  serverError: "Помилка сервера.",

  auth: {
    invalidCredentials: "Хибний код підприємства, ім'я користувача або пароль.",
    invalidRefreshToken: "Refresh-токен хибний або протермінований.",
    orgCodeTaken: "Цей код підприємства вже зайнято.",
    usernameOrEmailTaken: "Це ім'я користувача або ел. пошта вже використовуються на цьому підприємстві.",
    usernameOrEmailTakenInOrg: "Це ім'я користувача або ел. пошта вже використовуються на цьому підприємстві.",
    orgCodeNotFound: "Такого коду підприємства не знайдено. Уточніть код у свого роботодавця.",
    requestAlreadyPending: "Заявку з таким іменем уже подано, вона очікує підтвердження.",
    requestRejected: "Вашу заявку на приєднання відхилено. Зв'яжіться з адміністратором підприємства.",
    pendingApproval:
      "Ваша заявка на приєднання ще очікує підтвердження адміністратора підприємства. Спробуйте пізніше.",
    pendingRequestNotFound: "Заявку в очікуванні не знайдено.",
    resetLinkExpired: "Посилання протерміноване або вже використане. Запитайте нове посилання для відновлення.",
  },

  timeLogs: {
    tooFar: (distance: number, radius: number) =>
      `Ви за ${distance} м від об'єкта, дозволено ${radius} м. Робочий день можна розпочати лише на об'єкті.`,
    alreadyStarted: "Робочий день на цьому об'єкті вже розпочато.",
    noActiveLog: "Активний робочий день не знайдено. Його не розпочато або вже завершено.",
    notFound: "Запис про роботу не знайдено.",
    endBeforeStart: "Час завершення раніший за початок робочого дня.",
    clockInFuture: "Годинник пристрою показує майбутнє. Перевірте час на телефоні та спробуйте ще раз.",
    clockInFutureShort: "Годинник пристрою показує майбутнє. Перевірте час на телефоні.",
    tooOldOffline: "Збережений робочий день застарий для автоматичного додавання. Зв'яжіться з адміністратором.",
    reasonRequired: (computed: number) =>
      `Для зміни годин вручну потрібна підстава. Години за присутністю: ${computed} год.`,
  },

  objects: {
    notFound: "Об'єкт не знайдено.",
    selectedNotFound: "Обраний об'єкт не знайдено.",
    hasTimeLogs: "Об'єкт не можна видалити, бо з ним пов'язані записи про роботу.",
  },

  users: {
    notFound: "Користувача не знайдено.",
    hasTimeLogs: "Користувача не можна видалити, бо з ним пов'язані записи про роботу.",
  },

  absences: {
    notFound: "Відсутність не знайдено.",
    overlapping: (from: string, to: string) => `У цього працівника вже є відсутність за період ${from} – ${to}.`,
  },

  workTypes: {
    notFound: "Вид робіт не знайдено.",
    selectedNotFound: "Обраний вид робіт не знайдено.",
    duplicate: "Вид робіт із такою назвою вже існує.",
    notOnObject: "Цей вид робіт не використовується на цьому об'єкті.",
  },

  clients: {
    notFound: "Замовника не знайдено.",
    duplicate: "Замовник із такою назвою вже існує.",
    hasObjects: "Замовника не можна видалити, оскільки з ним пов'язані об'єкти.",
    missingDetails: "У замовника не вказано назву або адресу — рахунок неможливо виставити.",
  },

  invoices: {
    notFound: "Рахунок не знайдено.",
    noBillableHours:
      "За обраний період немає оплачуваних годин. Перевірте, чи вказані ставки для видів робіт.",
    alreadyVoided: "Рахунок уже анульовано.",
    cannotVoidPaid: "Оплачений рахунок не можна анулювати. Оформіть кредит-ноту.",
    sellerDetailsMissing: "Реквізити вашої компанії не заповнені. Додайте їх у налаштуваннях.",
  },

  billing: {
    notConfigured: "Приймання платежів не налаштовано.",
    notConfiguredContact: "Приймання платежів ще не налаштовано. Зв'яжіться з Nutisemud.",
  },

  password: {
    tooShort: "Пароль має містити щонайменше 12 символів.",
    needsDigit: "Пароль має містити щонайменше одну цифру.",
    needsSymbol: "Пароль має містити щонайменше один спеціальний символ.",
  },

  access: {
    forbidden: "Недостатньо прав.",
    missingAuth: "Автентифікація відсутня.",
    invalidToken: "Токен хибний або протермінований.",
    sessionEnded: "Сесію завершено. Увійдіть знову.",
    unauthorized: "Потрібна автентифікація.",
  },
};

const CATALOGUE = { et, en, ru, uk };

export type Language = keyof typeof CATALOGUE;

function isLanguage(value: string): value is Language {
  return value in CATALOGUE;
}

/**
 * Valib keele `Accept-Language` päisest.
 *
 * Kvaliteedikaale (`;q=`) järjestame, kuna brauser saadab need eelistuse
 * järjekorras ja esimene ei pruugi olla kõige eelistatum. Tundmatu keele
 * korral jääb eesti keel, kuna toode on Eesti turule.
 */
export function pickLanguage(header: string | undefined): Language {
  if (!header) return "et";

  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      return { tag: tag.trim().toLowerCase(), q: q ? Number(q.split("=")[1]) : 1 };
    })
    .filter((entry) => Number.isFinite(entry.q))
    .sort((a, b) => b.q - a.q);

  for (const { tag } of ranked) {
    const base = tag.split("-")[0];
    if (isLanguage(base)) return base;
  }
  return "et";
}

export function messagesFor(language: Language): Messages {
  return CATALOGUE[language];
}
