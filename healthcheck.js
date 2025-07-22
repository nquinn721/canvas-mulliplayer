const http = require("http");

const options = {
  hostname: process.env.NODE_ENV === "production" ? "0.0.0.0" : "localhost",
  port: process.env.PORT || 3001,
  path: "/health",
  method: "GET",
  timeout: 10000,
};

const request = http.request(options, (res) => {
  if (res.statusCode === 200) {
    console.log("Health check passed");
    process.exit(0);
  } else {
    console.log(`Health check failed with status code: ${res.statusCode}`);
    process.exit(1);
  }
});

request.on("error", (err) => {
  console.log(`Health check failed with error: ${err.message}`);
  process.exit(1);
});

request.on("timeout", () => {
  console.log("Health check timed out");
  request.destroy();
  process.exit(1);
});

request.setTimeout(10000);
request.end();
