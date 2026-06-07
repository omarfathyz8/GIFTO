const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

export const uploadToCloudinary = async (file) => {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error("Cloudinary credentials not configured");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Cloudinary error: ${errorData.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.secure_url;
};

export const getOptimizedImageUrl = (cloudinaryUrl, width = 500, quality = "auto") => {
  if (!cloudinaryUrl || !cloudinaryUrl.includes("cloudinary.com")) {
    return cloudinaryUrl;
  }

  // Transform the URL to include optimization parameters
  return cloudinaryUrl.replace(
    "/upload/",
    `/upload/w_${width},q_${quality},f_auto/`
  );
};
