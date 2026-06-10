import { openDatabase } from "./database";
import { SmartHomeRepository } from "./repository";
import { SmartHomeService } from "../services/smart-home-service";

export function createService(): SmartHomeService {
  const db = openDatabase();
  return new SmartHomeService(new SmartHomeRepository(db));
}
