/**
 * Entorno de los tests.
 *
 * `src/env.ts` valida las variables y hace `process.exit(1)` si falta alguna,
 * así que hay que fijarlas antes de que se importe cualquier módulo de la app.
 * Se usan valores explícitos para no depender del .env de cada máquina.
 */
process.env.NODE_ENV = "test";
process.env.JWT_SECRET ??= "clave-de-pruebas-con-al-menos-32-caracteres";
process.env.DATABASE_URL ??= "postgresql://postgres:postgres@localhost:5432/geriatria_test?schema=public";
process.env.STORAGE_DIR ??= "./storage-test";
process.env.CORS_ORIGIN ??= "http://localhost:3028";
