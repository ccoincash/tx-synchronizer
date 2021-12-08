import { MAPI_TARGET } from "bsv-util";
import { MempoolSyncer } from "../src/mempoolAutoSyncer";

let taalSyncer = new MempoolSyncer(MAPI_TARGET.GORILLA);
taalSyncer.restartJob();

process.on("uncaughtException", (e) => {
  console.log("error: ", e);
});
