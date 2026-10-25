import { Client, Databases } from "appwrite";
import { APPWRITE_CONFIG } from "./config";

let clientInstance: Client | null = null;
let databasesInstance: Databases | null = null;

export function getAppwriteClient(): Client {
  if (!clientInstance) {
    clientInstance = new Client()
      .setEndpoint(APPWRITE_CONFIG.endpoint)
      .setProject(APPWRITE_CONFIG.projectId);

    const rawHeaders = (clientInstance as any).headers;
    if (rawHeaders && typeof rawHeaders === "object") {
      delete rawHeaders["X-Appwrite-Response-Format"];
      delete rawHeaders["x-sdk-version"];
      rawHeaders["x-appwrite-response-format"] = "1.6.0";
    }
  }
  return clientInstance;
}

export function getAppwriteDatabases(): Databases {
  if (!databasesInstance) {
    const client = getAppwriteClient();
    databasesInstance = new Databases(client);
  }
  return databasesInstance;
}
