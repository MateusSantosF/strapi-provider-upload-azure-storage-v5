"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const stream_1 = require("stream");
const storage_blob_1 = require("@azure/storage-blob");
exports.default = {
    init: (options) => {
        const { account, accountKey, containerName, defaultPath = "", serviceBaseURL = `https://${account}.blob.core.windows.net`, sasToken = "", sizeLimit, } = options;
        const credential = new storage_blob_1.StorageSharedKeyCredential(account, accountKey);
        const blobServiceClient = new storage_blob_1.BlobServiceClient(serviceBaseURL, credential);
        const containerClient = blobServiceClient.getContainerClient(containerName);
        containerClient.createIfNotExists().catch((err) => {
            console.error("Azure container creation error:", err);
        });
        const getBlobClient = (file) => {
            const filename = `${file.hash}${file.ext}`;
            const blobPath = defaultPath ? `${defaultPath}/${filename}` : filename;
            return containerClient.getBlockBlobClient(blobPath);
        };
        return {
            /**
             * Upload file via buffer
             */
            upload: (file) => __awaiter(void 0, void 0, void 0, function* () {
                // Size check
                if (sizeLimit && file.size && file.size > sizeLimit) {
                    throw new Error(`File size exceeds limit of ${sizeLimit} bytes`);
                }
                const blobClient = getBlobClient(file);
                if (file.buffer) {
                    yield blobClient.uploadData(file.buffer, {
                        blobHTTPHeaders: { blobContentType: file.mime },
                    });
                }
                file.url = `${serviceBaseURL}/${containerName}/${blobClient.name}`;
                return file;
            }),
            /**
             * Upload via stream
             */
            uploadStream: (file) => __awaiter(void 0, void 0, void 0, function* () {
                const blobClient = getBlobClient(file);
                yield blobClient.uploadStream(file.stream || stream_1.Readable.from([]), undefined, undefined, { blobHTTPHeaders: { blobContentType: file.mime } });
                file.url = `${serviceBaseURL}/${containerName}/${blobClient.name}`;
                return file;
            }),
            /**
             * Delete blob
             */
            delete: (file) => __awaiter(void 0, void 0, void 0, function* () {
                const blobClient = getBlobClient(file);
                yield blobClient.deleteIfExists();
            }),
            /**
             * Optional: enforce size limit on buffer
             */
            checkFileSize: (file, { sizeLimit: limit }) => {
                var _a, _b, _c;
                const actual = (_c = (_a = file.size) !== null && _a !== void 0 ? _a : (_b = file.buffer) === null || _b === void 0 ? void 0 : _b.length) !== null && _c !== void 0 ? _c : 0;
                if (limit && actual > limit) {
                    throw new Error(`File too large: ${actual} > ${limit}`);
                }
            },
            /**
             * Generate a signed URL (SAS) when using private container
             */
            getSignedUrl: (file) => __awaiter(void 0, void 0, void 0, function* () {
                const blobClient = getBlobClient(file);
                if (sasToken) {
                    // Return existing SAS-based URL
                    return {
                        url: `${serviceBaseURL}/${containerName}/${blobClient.name}?${sasToken}`,
                    };
                }
                // Generate SAS token valid for 1 hour
                const expiresOn = new Date(new Date().valueOf() + 3600 * 1000);
                const sas = (0, storage_blob_1.generateBlobSASQueryParameters)({
                    containerName,
                    blobName: blobClient.name,
                    permissions: storage_blob_1.BlobSASPermissions.parse("r"),
                    expiresOn,
                    protocol: storage_blob_1.SASProtocol.Https,
                }, credential).toString();
                return {
                    url: `${serviceBaseURL}/${containerName}/${blobClient.name}?${sas}`,
                };
            }),
            isPrivate: () => {
                return Boolean(sasToken);
            },
        };
    },
};
