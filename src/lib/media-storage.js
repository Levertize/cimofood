export const MAX_UPLOAD_IMAGE_BYTES = 2 * 1024 * 1024;

const MIME_TO_EXT = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Validates an uploaded image buffer by MIME type and 2 MB size cap.
 */
export function validateImageUpload({ fileBuffer, mimeType }) {
  const ext = MIME_TO_EXT[String(mimeType || "").toLowerCase()];
  if (!ext) {
    throw new Error("Format gambar harus JPG, PNG, atau WebP.");
  }
  if (!fileBuffer || fileBuffer.byteLength === 0) {
    throw new Error("File gambar kosong atau tidak terbaca.");
  }
  if (fileBuffer.byteLength > MAX_UPLOAD_IMAGE_BYTES) {
    throw new Error("Ukuran gambar maksimal 2 MB.");
  }
  return {
    ext,
    toDataUrl() {
      return `data:${mimeType};base64,${fileBuffer.toString("base64")}`;
    },
  };
}

/**
 * Extracts and validates the first non-empty image file from multipart FormData.
 */
export async function readImageFromFormData(
  formData,
  fieldNames,
  missingMessage = "Pilih file gambar terlebih dahulu."
) {
  let file = null;
  for (const field of fieldNames) {
    const candidate = formData.get(field);
    if (candidate && typeof candidate !== "string") {
      file = candidate;
      break;
    }
  }

  if (!file) {
    throw new Error(missingMessage);
  }

  const arrayBuffer = await file.arrayBuffer();
  return {
    fileBuffer: Buffer.from(arrayBuffer),
    fileName: file.name || "upload.jpg",
    mimeType: file.type,
  };
}

/**
 * Extracts the bucket object key from either a raw key or a Supabase public storage URL.
 */
export function extractStorageObjectPath(bucket, value) {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith("data:") || trimmed.startsWith("/")) {
    return null;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    const marker = `/storage/v1/object/public/${bucket}/`;
    const idx = trimmed.indexOf(marker);
    if (idx === -1) return null;
    const rawPath = trimmed.slice(idx + marker.length).split("?")[0];
    return rawPath ? decodeURIComponent(rawPath) : null;
  }
  return trimmed;
}

/**
 * Removes an obsolete Supabase Storage object without failing the primary workflow.
 */
export async function removeStorageObjectQuietly(admin, bucket, value) {
  const objectPath = extractStorageObjectPath(bucket, value);
  if (!objectPath) return;
  try {
    await admin.storage.from(bucket).remove([objectPath]);
  } catch {
    // Abaikan kegagalan hapus berkas lama agar alur utama tidak terganggu
  }
}

/**
 * Uploads an image buffer to Supabase Storage and optionally returns its public URL.
 */
export async function uploadImageToBucket(
  admin,
  { bucket, objectPath, fileBuffer, mimeType, isPublic = false }
) {
  const { error: uploadErr } = await admin.storage
    .from(bucket)
    .upload(objectPath, fileBuffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (uploadErr) {
    throw new Error(uploadErr.message);
  }

  if (!isPublic) {
    return { objectPath, publicUrl: null };
  }

  const { data } = admin.storage.from(bucket).getPublicUrl(objectPath);
  return { objectPath, publicUrl: data?.publicUrl || null };
}

/**
 * Generates short-lived signed URLs for private payment and packing proof media.
 */
export async function resolveOrderMediaUrls(admin, order, expiresInSeconds = 3600) {
  if (!order) {
    return { payment_proof_signed_url: null, packing_proof_signed_url: null };
  }

  if (!admin) {
    return {
      payment_proof_signed_url: order.payment_proof_url || null,
      packing_proof_signed_url: order.packing_proof_url || null,
    };
  }

  const createSigned = async (rawPath) => {
    const objectPath = extractStorageObjectPath("payment-proofs", rawPath);
    if (!objectPath) return rawPath || null;
    const { data } = await admin.storage
      .from("payment-proofs")
      .createSignedUrl(objectPath, expiresInSeconds);
    return data?.signedUrl || null;
  };

  const [paymentSigned, packingSigned] = await Promise.all([
    createSigned(order.payment_proof_url),
    createSigned(order.packing_proof_url),
  ]);

  return {
    payment_proof_signed_url: paymentSigned,
    packing_proof_signed_url: packingSigned,
  };
}
