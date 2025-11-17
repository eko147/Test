const express = require("express");

const app = express();

app.use(express.json());
app.use(express.urlencoded( {extended : false } ));

app.use((req, res, next) => {
  res.append('Access-Control-Allow-Origin', ['*']);
  res.append('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  res.append('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

app.get("/*", (req, res, next) => {
  if (req.path.includes("/me/profile")) {
    console.log("header", req.headers);
    res.status(200).json({
      username: "heshin"
    });
  }
  else {
    next();
  }
});

app.post("/*", (req, res) => {
  console.log("path", req.path);
  console.log("header", req.headers);
  console.log("body", req.body);
})


app.listen(8000, () => console.log("Server running"));
