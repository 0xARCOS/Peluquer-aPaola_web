// ================================================================
// Paola Peluquería — Sistema de reservas por slots
// Google Apps Script Web App
//
// INSTRUCCIONES DE INSTALACIÓN (hazlo UNA vez, en la cuenta de Paola):
// 1. Inicia sesión en Google CON LA CUENTA DE PAOLA (muy importante:
//    las citas se crean en el calendario de quien despliega el script).
// 2. Ve a https://script.google.com y crea un nuevo proyecto.
// 3. Borra el contenido del editor y pega TODO este archivo.
// 4. Rellena los dos valores de CONFIGURACIÓN de abajo (OWNER_EMAIL
//    y, si quieres, CALENDAR_ID).
// 5. Menú "Implementar" → "Nueva implementación"
//    - Tipo: Aplicación web
//    - Ejecutar como: Yo (la cuenta de Paola)
//    - Quién tiene acceso: Cualquier persona
// 6. La primera vez Google pedirá AUTORIZAR permisos de Calendar y
//    Gmail: acéptalos (es lo que permite crear la cita y avisar).
// 7. Copia la URL ("URL de la aplicación web") y pégala en booking.html
//    donde dice GAS_URL = ''
//
// API (GET requests):
//   ?action=slots&date=AAAA-MM-DD   → slots disponibles del día
//   ?action=book&date=...&time=...&service=...&name=...  → crear cita
// ================================================================

// ===================== CONFIGURACIÓN ============================
// Email de Paola: recibirá un aviso instantáneo en cada reserva
// (le llega al móvil por la app de Gmail). DÉJALO BIEN PUESTO.
const OWNER_EMAIL = 'paolapeluqueriaybelleza@gmail.com';

// Calendario donde se crean las citas.
//   '' (vacío)  → calendario principal de la cuenta que ejecuta el script.
//   o el ID de un calendario concreto (Ajustes del calendario →
//   "Integrar calendario" → "ID de calendario", suele ser el email).
const CALENDAR_ID = '';

// Minutos antes de la cita en que Paola recibe un recordatorio en Calendar.
const REMINDERS_MIN = [24 * 60, 60]; // 1 día antes y 1 hora antes
// ================================================================

const SLOT_MIN = 60; // Duración de cada cita en minutos

// Horario del salón (getDay(): 0=Dom, 1=Lun, 2=Mar, 3=Mié, 4=Jue, 5=Vie, 6=Sáb)
const SCHEDULE = {
  1: [{ s: '10:00', e: '14:00' }, { s: '16:00', e: '20:00' }],
  2: [{ s: '10:00', e: '14:00' }, { s: '16:00', e: '20:00' }],
  3: [{ s: '10:00', e: '14:00' }, { s: '16:00', e: '20:00' }],
  4: [{ s: '10:00', e: '14:00' }, { s: '16:00', e: '20:00' }],
  5: [{ s: '10:00', e: '14:00' }, { s: '16:00', e: '20:00' }],
  6: [{ s: '10:30', e: '14:00' }],
  0: []
};

// Devuelve el calendario configurado (o el principal si CALENDAR_ID está vacío)
function getCal() {
  if (CALENDAR_ID) {
    const cal = CalendarApp.getCalendarById(CALENDAR_ID);
    if (!cal) throw new Error('No se encontró el calendario con ID: ' + CALENDAR_ID);
    return cal;
  }
  return CalendarApp.getDefaultCalendar();
}

// ----------------------------------------------------------------
// Punto de entrada HTTP GET
// ----------------------------------------------------------------
function doGet(e) {
  const action = (e.parameter && e.parameter.action) || 'slots';
  let result;

  try {
    if (action === 'slots') {
      const date = e.parameter.date;
      if (!date) throw new Error('Falta el parámetro date (AAAA-MM-DD)');
      result = { slots: getAvailableSlots(date) };

    } else if (action === 'book') {
      const { date, time, service, name } = e.parameter;
      if (!date || !time || !service || !name) {
        throw new Error('Faltan parámetros obligatorios: date, time, service, name');
      }
      createBooking(date, time, service, name);
      result = { ok: true };

    } else {
      throw new Error('Acción desconocida: ' + action);
    }
  } catch (err) {
    result = { error: err.message };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ----------------------------------------------------------------
// Devuelve los slots libres para una fecha AAAA-MM-DD
// ----------------------------------------------------------------
function getAvailableSlots(dateStr) {
  // Usar mediodía para evitar desfases de zona horaria al calcular getDay()
  const date = new Date(dateStr + 'T12:00:00');
  const dow = date.getDay();
  const ranges = SCHEDULE[dow] || [];
  if (ranges.length === 0) return [];

  // Generar todos los slots posibles según el horario
  const allSlots = [];
  for (const { s, e } of ranges) {
    const [sh, sm] = s.split(':').map(Number);
    const [eh, em] = e.split(':').map(Number);
    let cur = sh * 60 + sm;
    const end = eh * 60 + em;
    while (cur + SLOT_MIN <= end) {
      allSlots.push(pad(Math.floor(cur / 60)) + ':' + pad(cur % 60));
      cur += SLOT_MIN;
    }
  }

  // Obtener eventos del día del calendario de Paola
  const [yr, mo, dy] = dateStr.split('-').map(Number);
  const dayStart = new Date(yr, mo - 1, dy, 0, 0, 0);
  const dayEnd   = new Date(yr, mo - 1, dy, 23, 59, 59);
  const events   = getCal().getEvents(dayStart, dayEnd);

  // Eliminar slots que se solapan con eventos existentes
  return allSlots.filter(slot => {
    const [h, m] = slot.split(':').map(Number);
    const slotStart = new Date(yr, mo - 1, dy, h, m, 0);
    const slotEnd   = new Date(slotStart.getTime() + SLOT_MIN * 60000);
    return !events.some(ev => slotStart < ev.getEndTime() && slotEnd > ev.getStartTime());
  });
}

// ----------------------------------------------------------------
// Crea el evento en Google Calendar (con verificación de disponibilidad)
// y avisa a Paola por email + recordatorios.
// ----------------------------------------------------------------
function createBooking(dateStr, time, service, name) {
  // Doble verificación para evitar race conditions
  const available = getAvailableSlots(dateStr);
  if (!available.includes(time)) {
    throw new Error('Este horario ya no está disponible, elige otro');
  }

  const [yr, mo, dy] = dateStr.split('-').map(Number);
  const [h, m] = time.split(':').map(Number);
  const start = new Date(yr, mo - 1, dy, h, m, 0);
  const end   = new Date(start.getTime() + SLOT_MIN * 60000);

  const event = getCal().createEvent(
    service + ' — ' + name,
    start,
    end,
    { description: 'Reserva online\nServicio: ' + service + '\nCliente: ' + name }
  );

  // Recordatorios para que a Paola le salte aviso antes de la cita
  try {
    event.removeAllReminders();
    REMINDERS_MIN.forEach(min => event.addPopupReminder(min));
  } catch (err) {
    // Si falla algún recordatorio no debe tumbar la reserva
  }

  // Aviso instantáneo por email (Gmail notifica al móvil al momento)
  notifyOwner(dateStr, time, service, name, start);
}

// ----------------------------------------------------------------
// Email de aviso a Paola en cada reserva nueva
// ----------------------------------------------------------------
function notifyOwner(dateStr, time, service, name, start) {
  if (!OWNER_EMAIL || OWNER_EMAIL.indexOf('@') === -1 ||
      OWNER_EMAIL === 'CORREO_DE_PAOLA@gmail.com') {
    return; // sin email configurado no se envía nada
  }

  const fechaBonita = Utilities.formatDate(start, 'Europe/Madrid', "EEEE d 'de' MMMM 'a las' HH:mm");
  const asunto = '💇 Nueva cita: ' + name + ' — ' + dateStr + ' ' + time;
  const cuerpo =
    'Tienes una nueva reserva online:\n\n' +
    '• Cliente: ' + name + '\n' +
    '• Servicio: ' + service + '\n' +
    '• Día y hora: ' + fechaBonita + '\n\n' +
    'La cita ya está bloqueada en tu Google Calendar.';

  try {
    MailApp.sendEmail(OWNER_EMAIL, asunto, cuerpo);
  } catch (err) {
    // No tumbar la reserva si el correo falla
  }
}

function pad(n) { return String(n).padStart(2, '0'); }
