import { Client, Databases } from "appwrite";
import { APPWRITE_CONFIG } from "./config";

let clientInstance: Client | null = null;
let databasesInstance: Databases | null = null;

export function getAppwriteClient(): Client {
  if (!clientInstance) {
    clientInstance = new Client()
      .setEndpoint(APPWRITE_CONFIG.endpoint)
      .setProject(APPWRITE_CONFIG.projectId);
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
