# strapi-provider-upload-azure-storage-v5
Azure Blob Storage upload provider for Strapi v5.

## Installation
```bash
npm install strapi-provider-upload-azure-storage-v5
```

## Configuration
```ts
// config/plugins.ts
export default ({ env }) => ({
  upload: {
    config: {
      provider: 'strapi-provider-upload-azure-storage-v5',
      providerOptions: {
        account: env('AZURE_STORAGE_ACCOUNT'),
        accountKey: env('AZURE_STORAGE_ACCOUNT_KEY'),
        containerName: env('AZURE_STORAGE_CONTAINER'),
        defaultPath: env('AZURE_STORAGE_DEFAULT_PATH', 'assets'),
        serviceBaseURL: env(
          'AZURE_STORAGE_URL',
          `https://${env('AZURE_STORAGE_ACCOUNT')}.blob.core.windows.net`
        ),
        // Optional: SAS token for private containers
        sasToken: env('AZURE_STORAGE_SAS_TOKEN', ''),
        sizeLimit: env('AZURE_UPLOAD_SIZE_LIMIT', 10 * 1024 * 1024), // 10MB
      },
      actionOptions: {
        upload: {},
        uploadStream: {},
        delete: {},
      },
    },
  },
});

// config/middlewares.ts
  {
    name: "strapi::security",
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          "connect-src": ["'self'", "https:"],
          "script-src": [
            "'self'",
            "unsafe-inline",
          ],
          "media-src": [
            "'self'",
            "blob:",
            "data:",
            `https://${process.env.AZURE_STORAGE_ACCOUNT}.blob.core.windows.net`,
          ],
          "img-src": [
            "'self'",
            "blob:",
            "data:",
            "market-assets.strapi.io",
            `https://${process.env.AZURE_STORAGE_ACCOUNT}.blob.core.windows.net`,

          ],
        },
      },
    },
  },