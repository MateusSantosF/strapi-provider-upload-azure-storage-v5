import { Readable } from "stream";
import {
  BlobServiceClient,
  StorageSharedKeyCredential,
  ContainerClient,
  BlockBlobClient,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
  SASProtocol,
} from "@azure/storage-blob";

interface ProviderOptions {
  account: string;
  accountKey: string;
  containerName: string;
  defaultPath?: string;
  serviceBaseURL?: string;
  sasToken?: string;
  sizeLimit?: number;
}
type UploadFile = {
  path?: string;
  hash: string;
  ext: string;
  buffer?: Buffer;
  stream?: NodeJS.ReadableStream;
  mime: string;
  size?: number;
  url?: string;
};

module.exports = {
  init: (options: ProviderOptions) => {
    const {
      account,
      accountKey,
      containerName,
      defaultPath = "",
      serviceBaseURL = `https://${account}.blob.core.windows.net`,
      sasToken = "",
      sizeLimit,
    } = options;

    const credential = new StorageSharedKeyCredential(account, accountKey);
    const blobServiceClient = new BlobServiceClient(serviceBaseURL, credential);
    const containerClient: ContainerClient =
      blobServiceClient.getContainerClient(containerName);

    containerClient.createIfNotExists().catch((err) => {
      console.error("Azure container creation error:", err);
    });

    const getBlobClient = (file: UploadFile): BlockBlobClient => {
      const filename = `${file.hash}${file.ext}`;
      const blobPath = defaultPath ? `${defaultPath}/${filename}` : filename;
      return containerClient.getBlockBlobClient(blobPath);
    };

    return {
      /**
       * Upload file via buffer
       */
      upload: async (file: UploadFile) => {
        // Size check
        if (sizeLimit && file.size && file.size > sizeLimit) {
          throw new Error(`File size exceeds limit of ${sizeLimit} bytes`);
        }
        const blobClient = getBlobClient(file);
        if (file.buffer) {
          await blobClient.uploadData(file.buffer, {
            blobHTTPHeaders: { blobContentType: file.mime },
          });
        }
        file.url = `${serviceBaseURL}/${containerName}/${blobClient.name}`;
        return file;
      },

      /**
       * Upload via stream
       */
      uploadStream: async (file: UploadFile) => {
        const blobClient = getBlobClient(file);
        await blobClient.uploadStream(
          (file.stream as Readable) || Readable.from([]),
          undefined,
          undefined,
          { blobHTTPHeaders: { blobContentType: file.mime } }
        );
        file.url = `${serviceBaseURL}/${containerName}/${blobClient.name}`;
        return file;
      },

      /**
       * Delete blob
       */
      delete: async (file: UploadFile) => {
        const blobClient = getBlobClient(file);
        await blobClient.deleteIfExists();
      },

      /**
       * Optional: enforce size limit on buffer
       */
      checkFileSize: (
        file: UploadFile,
        { sizeLimit: limit }: { sizeLimit: number }
      ) => {
        const actual = file.size ?? file.buffer?.length ?? 0;
        if (limit && actual > limit) {
          throw new Error(`File too large: ${actual} > ${limit}`);
        }
      },

      /**
       * Generate a signed URL (SAS) when using private container
       */
      getSignedUrl: async (file: UploadFile) => {
        const blobClient = getBlobClient(file);
        if (sasToken) {
          // Return existing SAS-based URL
          return {
            url: `${serviceBaseURL}/${containerName}/${blobClient.name}?${sasToken}`,
          };
        }
        // Generate SAS token valid for 1 hour
        const expiresOn = new Date(new Date().valueOf() + 3600 * 1000);
        const sas = generateBlobSASQueryParameters(
          {
            containerName,
            blobName: blobClient.name,
            permissions: BlobSASPermissions.parse("r"),
            expiresOn,
            protocol: SASProtocol.Https,
          },
          credential
        ).toString();
        return {
          url: `${serviceBaseURL}/${containerName}/${blobClient.name}?${sas}`,
        };
      },

      isPrivate: () => {
        return Boolean(sasToken);
      },
    };
  },
};
