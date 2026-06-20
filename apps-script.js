// ================================================================
// Paola Peluquería — Sistema de reservas por slots
// Google Apps Script Web App
//
// INSTRUCCIONES DE INSTALACIÓN:
// 1. Ve a https://script.google.com y crea un nuevo proyecto
// 2. Borra el contenido del editor y pega TODO este archivo
// 3. Menú "Implementar" → "Nueva implementación"
//    - Tipo: Aplicación web
//    - Ejecutar como: Yo (tu cuenta de Google)
//    - Quién tiene acceso: Cualquier persona
// 4. Copia la URL que te da ("URL de la aplicación web")
// 5. Pégala en booking.html donde dice GAS_URL = ''
//
// API (GET requests):
//   ?action=slots&date=AAAA-MM-DD   → slots disponibles del día
//   ?action=book&date=...&time=...&service=...&name=...  → crear cita
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

  // Obtener eventos del día del calendario principal de Paola
  const [yr, mo, dy] = dateStr.split('-').map(Number);
  const dayStart = new Date(yr, mo - 1, dy, 0, 0, 0);
  const dayEnd   = new Date(yr, mo - 1, dy, 23, 59, 59);
  const events   = CalendarApp.getDefaultCalendar().getEvents(dayStart, dayEnd);

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

  CalendarApp.getDefaultCalendar().createEvent(
    service + ' — ' + name,
    start,
    end,
    { description: 'Reserva online\nServicio: ' + service + '\nCliente: ' + name }
  );
}

function pad(n) { return String(n).padStart(2, '0'); }
