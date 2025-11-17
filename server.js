const express = require("express");
const path = require("path");

const app = express();

app.use((req, res, next) => {
    res.append('Access-Control-Allow-Origin', ['*']);
    res.append('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.append('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

app.use("/srcs", express.static(path.resolve(__dirname, "front", "srcs"), 
  { extensions: ["js"] }
));

app.use("/assets", express.static(path.resolve(__dirname, "front", "srcs", "assets")));

app.use("/three", express.static(path.resolve(__dirname, "node_modules", "three"), 
  { extensions: ["js"] }
));

app.use("/node_modules", express.static(path.resolve(__dirname, "node_modules"),
  { extensions: ["js"] }
));


app.get("/*", (req, res, next) => {
  res.sendFile(path.resolve("front/srcs", "index.html"));
});

app.listen(8080, () => console.log("Server running"));
