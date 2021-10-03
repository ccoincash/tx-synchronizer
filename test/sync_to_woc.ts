import { syncFromMempoolToWoc } from "../src";

const run = async () => {
  try {
    await syncFromMempoolToWoc();
  } catch (e) {
    console.log(e);
  }
};

run();
