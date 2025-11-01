const express = require("express");
const path = require("path");
const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// import generated routes automatically later
const userRoutes = require("./routes/user.routes");
app.use("/users", userRoutes);

app.listen(3000, () => console.log("✅ Server running on http://localhost:3000"));
