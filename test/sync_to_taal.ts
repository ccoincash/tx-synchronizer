import { syncMempoolToTaal } from "../src";

const run = async () => {
  try {
    await syncMempoolToTaal();
  } catch (e) {
    console.log(e);
  }
};

run();
