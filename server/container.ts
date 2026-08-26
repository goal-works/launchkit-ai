import { LaunchKitService } from "./service";
import { getStore } from "./store";

export const service = new LaunchKitService(getStore());
