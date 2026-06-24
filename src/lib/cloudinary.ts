import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const CMS_IMAGE_MAX_SIZE = 1600;

export async function uploadCmsImage(buffer: Buffer, filenameHint: string): Promise<string> {
  const result = await new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "cms",
        public_id: filenameHint,
        resource_type: "image",
        transformation: [{ width: CMS_IMAGE_MAX_SIZE, height: CMS_IMAGE_MAX_SIZE, crop: "limit" }],
        fetch_format: "auto",
        quality: "auto",
      },
      (error, uploadResult) => {
        if (error || !uploadResult) {
          reject(error ?? new Error("Cloudinary upload failed."));
          return;
        }
        resolve(uploadResult);
      },
    );
    stream.end(buffer);
  });

  return result.secure_url;
}
