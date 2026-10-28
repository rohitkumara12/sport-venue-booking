import { AppError } from "../errors/Apperror";
import type { CreateCourtInput } from "../features/courts/courts.services";

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim() !== "";

export function validateCreateCourt(body: unknown): CreateCourtInput {
  const { name, sportType, pricePerHour, description, photos } = (body ?? {}) as Record<string, unknown>;

  if (!isNonEmptyString(name) || name.length > 125) {
    throw new AppError(400, "Nama lapangan wajib diisi (maksimal 125 karakter)");
  }
  if (!isNonEmptyString(sportType) || sportType.length > 100) {
    throw new AppError(400, "Jenis olahraga wajib diisi");
  }
  const price = Number(pricePerHour);
  if (!Number.isFinite(price) || price <= 0) {
    throw new AppError(400, "Harga per jam harus angka lebih dari 0");
  }
  if (description !== undefined && typeof description !== "string") {
    throw new AppError(400, "Deskripsi harus berupa teks");
  }
  if (photos !== undefined && (!Array.isArray(photos) || !photos.every(isNonEmptyString))) {
    throw new AppError(400, "Foto harus berupa daftar URL");
  }

  return {
    name: name.trim(),
    sportType: sportType.trim(),
    pricePerHour: price,
    description: description?.trim(),
    photos: photos as string[] | undefined,
  };
}
