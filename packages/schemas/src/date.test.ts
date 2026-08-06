/**
 * Tests de las fechas en la zona de la clínica.
 *
 * El punto central: el resultado NO debe depender del huso del equipo. Antes,
 * `parseDate`/`combineDateTime` interpretaban la entrada en hora local mientras
 * `formatDate`/`formatTime` la mostraban en hora de Paraguay, así que desde un
 * navegador en otro huso una cita caía en el día equivocado.
 */
import { describe, it, expect, afterEach } from "vitest";
import {
  formatDate,
  formatTime,
  parseDate,
  combineDateTime,
  calculateAge,
  clinicDayKey,
  isSameClinicDay,
  clinicStartOfDay,
  clinicEndOfDay,
  clinicWallClockToDate,
} from "./date.js";

const TZ_ORIGINAL = process.env.TZ;

/** Ejecuta el caso simulando que el equipo está en otra zona horaria. */
function enZona(tz: string, fn: () => void) {
  process.env.TZ = tz;
  try {
    fn();
  } finally {
    process.env.TZ = TZ_ORIGINAL;
  }
}

afterEach(() => {
  process.env.TZ = TZ_ORIGINAL;
});

// Paraguay está en UTC-3; se eligen husos bien alejados a ambos lados.
const ZONAS = ["America/Asuncion", "UTC", "Europe/Madrid", "Asia/Tokyo", "Pacific/Kiritimati"];

describe("el simulacro de zona horaria funciona", () => {
  // Si Node dejara de releer process.env.TZ, todos los tests por zona pasarían
  // sin probar nada. Esta guarda hace visible ese escenario.
  it("cambiar TZ altera la interpretación de la hora local", () => {
    let utc = "";
    let tokyo = "";
    enZona("UTC", () => {
      utc = new Date(2026, 2, 15, 9, 0).toISOString();
    });
    enZona("Asia/Tokyo", () => {
      tokyo = new Date(2026, 2, 15, 9, 0).toISOString();
    });
    expect(utc).not.toBe(tokyo);
  });
});

describe("ida y vuelta de fechas", () => {
  it.each(ZONAS)("formatDate(parseDate(x)) === x en %s", (tz) => {
    enZona(tz, () => {
      for (const entrada of ["15/03/2026", "01/01/1942", "29/02/2024", "31/12/1999"]) {
        expect(formatDate(parseDate(entrada))).toBe(entrada);
      }
    });
  });

  it.each(ZONAS)("combineDateTime conserva fecha y hora en %s", (tz) => {
    enZona(tz, () => {
      const dt = combineDateTime("15/03/2026", "09:30");
      expect(dt).not.toBeNull();
      expect(formatDate(dt)).toBe("15/03/2026");
      expect(formatTime(dt)).toBe("09:30");
    });
  });

  it.each(ZONAS)("conserva los bordes del día (00:00 y 23:59) en %s", (tz) => {
    enZona(tz, () => {
      expect(formatTime(combineDateTime("15/03/2026", "00:00"))).toBe("00:00");
      expect(formatDate(combineDateTime("15/03/2026", "00:00"))).toBe("15/03/2026");
      expect(formatTime(combineDateTime("15/03/2026", "23:59"))).toBe("23:59");
      expect(formatDate(combineDateTime("15/03/2026", "23:59"))).toBe("15/03/2026");
    });
  });
});

describe("el instante resultante no depende del huso del equipo", () => {
  it("la misma fecha y hora produce el mismo instante en cualquier zona", () => {
    const instantes = ZONAS.map((tz) => {
      let ms = 0;
      enZona(tz, () => {
        ms = combineDateTime("15/03/2026", "09:00")!.getTime();
      });
      return ms;
    });
    expect(new Set(instantes).size).toBe(1);
  });

  it("las 09:00 de la clínica son las 12:00 UTC (Paraguay = UTC-3)", () => {
    const dt = clinicWallClockToDate(2026, 3, 15, 9, 0);
    expect(dt.toISOString()).toBe("2026-03-15T12:00:00.000Z");
  });
});

describe("agrupación por día de la clínica", () => {
  it("una cita de las 23:00 pertenece a su día, no al siguiente", () => {
    const cita = combineDateTime("15/03/2026", "23:00")!;
    expect(clinicDayKey(cita)).toBe("2026-03-15");
    expect(isSameClinicDay(cita, combineDateTime("15/03/2026", "08:00")!)).toBe(true);
    expect(isSameClinicDay(cita, combineDateTime("16/03/2026", "08:00")!)).toBe(false);
  });

  it.each(ZONAS)("clinicDayKey da el mismo resultado en %s", (tz) => {
    // Instante fijo: 2026-03-16T01:00Z = 15/03/2026 22:00 en Paraguay.
    const instante = new Date("2026-03-16T01:00:00.000Z");
    enZona(tz, () => {
      expect(clinicDayKey(instante)).toBe("2026-03-15");
    });
  });

  it("el rango del día cubre exactamente 24 horas", () => {
    const referencia = new Date("2026-03-15T18:00:00.000Z");
    const inicio = clinicStartOfDay(referencia);
    const fin = clinicEndOfDay(referencia);
    expect(fin.getTime() - inicio.getTime()).toBe(24 * 60 * 60_000);
    expect(formatTime(inicio)).toBe("00:00");
    expect(clinicDayKey(inicio)).toBe("2026-03-15");
    // El fin es exclusivo: ya pertenece al día siguiente.
    expect(clinicDayKey(fin)).toBe("2026-03-16");
  });
});

describe("entradas inválidas", () => {
  it.each(["", "no es fecha", "31/02/2026", "15-03-2026", "2026-03-15"])(
    "parseDate rechaza %s",
    (entrada) => {
      expect(parseDate(entrada)).toBeNull();
    },
  );

  it.each([
    ["hora fuera de rango", "15/03/2026", "25:00"],
    ["minutos fuera de rango", "15/03/2026", "10:60"],
    ["fecha inexistente", "31/02/2026", "10:00"],
    ["formato de hora inválido", "15/03/2026", "9:00"],
  ])("combineDateTime rechaza %s", (_caso, fecha, hora) => {
    expect(combineDateTime(fecha, hora)).toBeNull();
  });
});

describe("calculateAge", () => {
  const referencia = combineDateTime("15/03/2026", "12:00")!;

  it("cuenta los años cumplidos", () => {
    expect(calculateAge(parseDate("15/03/1942")!, referencia)).toBe(84);
  });

  it("no suma el año hasta el día del cumpleaños", () => {
    expect(calculateAge(parseDate("16/03/1942")!, referencia)).toBe(83);
  });

  it.each(ZONAS)("da el mismo resultado en %s", (tz) => {
    enZona(tz, () => {
      expect(calculateAge(new Date("1942-03-15T03:00:00.000Z"), referencia)).toBe(84);
    });
  });
});
