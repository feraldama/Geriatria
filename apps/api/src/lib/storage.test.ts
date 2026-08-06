/**
 * Tests de la capa de almacenamiento de documentos clínicos.
 *
 * El foco es el recorrido de rutas: `patientId` viene de la URL y Express ya lo
 * decodifica, así que un `..%2f..%2fetc` llega como `../../etc`. Sin validación,
 * multer escribiría el archivo fuera de STORAGE_DIR.
 */
import { describe, it, expect } from "vitest";
import path from "node:path";
import { assertSafeId, absolutePath, relativePathFor } from "./storage.js";

const CUID_VALIDO = "clx3k9q2p0000abcdefghijkl";

describe("assertSafeId", () => {
  it("acepta un cuid", () => {
    expect(assertSafeId(CUID_VALIDO)).toBe(CUID_VALIDO);
  });

  it.each([
    ["..", ".."],
    ["padre relativo", "../../etc"],
    ["separador unix", "abc/def"],
    ["separador windows", "abc\\def"],
    ["ruta absoluta unix", "/etc/passwd"],
    ["ruta absoluta windows", "C:\\Windows"],
    ["punto", "."],
    ["vacío", ""],
    ["nulo embebido", "abcdefghijklmnopqrstu\u0000"],
    ["demasiado corto", "abc"],
    ["con espacios", "abcdefghijklmnopqrst uv"],
  ])("rechaza %s", (_caso, entrada) => {
    expect(() => assertSafeId(entrada)).toThrow("Identificador inválido");
  });
});

describe("absolutePath", () => {
  it("resuelve una ruta normal dentro del almacenamiento", () => {
    const rel = relativePathFor(CUID_VALIDO, "archivo.pdf");
    const abs = absolutePath(rel);
    expect(abs).toContain(CUID_VALIDO);
    expect(path.isAbsolute(abs)).toBe(true);
  });

  it.each([
    ["escape con ..", "../fuera.pdf"],
    ["escape profundo", "../../../etc/passwd"],
    ["escape mixto", `${CUID_VALIDO}/../../fuera.pdf`],
    ["raíz misma", "."],
  ])("rechaza %s", (_caso, rel) => {
    expect(() => absolutePath(rel)).toThrow("Ruta de archivo inválida");
  });
});
